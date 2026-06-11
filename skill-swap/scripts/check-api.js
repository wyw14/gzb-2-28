#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const BACKEND_FILE = path.join(ROOT_DIR, 'backend', 'server.js');
const FRONTEND_API_FILE = path.join(ROOT_DIR, 'frontend', 'src', 'api', 'index.js');

function extractBackendRoutes(content) {
  const routes = [];
  const routePattern = /app\.(get|post|put|delete|patch)\(\s*`?\$\{API_PREFIX\}([^`]+)`?\s*,/g;
  const oldPattern = /app\.(get|post|put|delete|patch)\(\s*['"]\/api([^'"]+)['"]\s*,/g;
  
  let match;
  while ((match = routePattern.exec(content)) !== null) {
    routes.push({
      method: match[1].toUpperCase(),
      path: '/api' + match[2]
    });
  }
  
  while ((match = oldPattern.exec(content)) !== null) {
    routes.push({
      method: match[1].toUpperCase(),
      path: '/api' + match[2]
    });
  }
  
  return routes;
}

function extractFrontendApis(content) {
  const apis = [];
  
  let baseURL = '';
  
  const baseURLStringMatch = content.match(/baseURL:\s*['"`]([^'"`]+)['"`]/);
  if (baseURLStringMatch) {
    baseURL = baseURLStringMatch[1];
  } else {
    const baseURLVarMatch = content.match(/const\s+(\w+)\s*=\s*(?:import\.meta\.env\.\w+\s*\|\|\s*)?['"`]([^'"`]+)['"`]/);
    if (baseURLVarMatch) {
      const varName = baseURLVarMatch[1];
      const defaultValue = baseURLVarMatch[2];
      const baseURLUsesVar = new RegExp(`baseURL:\\s*${varName}\\b`).test(content);
      if (baseURLUsesVar) {
        baseURL = defaultValue;
      }
    }
  }
  
  if (!baseURL) {
    baseURL = '/api';
  }
  
  const apiPattern = /\b(get|post|put|delete|patch)\(\s*['"`]([^'"`]+)['"`]/g;
  const templatePattern = /\b(get|post|put|delete|patch)\(\s*`([^`]+)`/g;
  
  let match;
  while ((match = apiPattern.exec(content)) !== null) {
    const url = match[2];
    if (url.startsWith('/')) {
      const fullPath = baseURL + url;
      apis.push({
        method: match[1].toUpperCase(),
        path: fullPath
      });
    }
  }
  
  while ((match = templatePattern.exec(content)) !== null) {
    const url = match[2];
    if (url.startsWith('/')) {
      const fullPath = baseURL + url;
      apis.push({
        method: match[1].toUpperCase(),
        path: fullPath,
        hasParams: url.includes('${')
      });
    }
  }
  
  return apis;
}

function normalizePath(path) {
  return path.replace(/:\w+/g, '{param}').replace(/\$\{[^}]+\}/g, '{param}');
}

function findMismatches(backendRoutes, frontendApis) {
  const errors = [];
  const warnings = [];
  
  const backendMap = new Map();
  backendRoutes.forEach(route => {
    const key = `${route.method}:${normalizePath(route.path)}`;
    if (!backendMap.has(key)) {
      backendMap.set(key, route);
    }
  });
  
  const frontendMap = new Map();
  frontendApis.forEach(api => {
    const key = `${api.method}:${normalizePath(api.path)}`;
    if (!frontendMap.has(key)) {
      frontendMap.set(key, api);
    }
  });
  
  backendRoutes.forEach(route => {
    const key = `${route.method}:${normalizePath(route.path)}`;
    if (!frontendMap.has(key)) {
      const similarKeys = Array.from(frontendMap.keys()).filter(k => {
        const bPath = normalizePath(route.path);
        const fPath = k.split(':')[1];
        return bPath.includes(fPath.split('/').pop()) || fPath.includes(bPath.split('/').pop());
      });
      
      if (similarKeys.length > 0) {
        warnings.push({
          type: 'method_mismatch',
          message: `后端 ${route.method} ${route.path} 可能与前端 ${similarKeys.join(', ')} 方法不匹配`,
          suggestion: '请检查 HTTP 方法是否正确'
        });
      } else {
        warnings.push({
          type: 'backend_only',
          message: `后端接口 ${route.method} ${route.path} 在前端未找到对应调用`,
          suggestion: '确认该接口是否需要前端调用，或前端是否遗漏了该接口的调用'
        });
      }
    }
  });
  
  frontendApis.forEach(api => {
    const key = `${api.method}:${normalizePath(api.path)}`;
    if (!backendMap.has(key)) {
      errors.push({
        type: 'frontend_only',
        message: `前端调用 ${api.method} ${api.path} 在后端未找到对应路由`,
        suggestion: '请检查后端是否实现了该接口，或前端路径是否正确'
      });
    }
  });
  
  return { errors, warnings };
}

function printReport(backendRoutes, frontendApis, mismatches) {
  console.log('\n' + '='.repeat(70));
  console.log('  接口对齐检查报告');
  console.log('='.repeat(70) + '\n');

  console.log(`后端接口总数: ${backendRoutes.length}`);
  console.log(`前端API调用总数: ${frontendApis.length}`);
  console.log();
  
  console.log('后端接口列表:');
  console.log('-'.repeat(70));
  backendRoutes
    .sort((a, b) => a.path.localeCompare(b.path))
    .forEach(route => {
      console.log(`  ${route.method.padEnd(6)} ${route.path}`);
    });
  console.log();
  
  console.log('前端API调用列表:');
  console.log('-'.repeat(70));
  frontendApis
    .sort((a, b) => a.path.localeCompare(b.path))
    .forEach(api => {
      console.log(`  ${api.method.padEnd(6)} ${api.path}`);
    });
  console.log();

  if (mismatches.errors.length > 0 || mismatches.warnings.length > 0) {
    console.log('问题列表:');
    console.log('-'.repeat(70));
    
    mismatches.errors.forEach(err => {
      console.log(`  ❌ ${err.message}`);
      console.log(`     💡 ${err.suggestion}`);
    });
    
    mismatches.warnings.forEach(warn => {
      console.log(`  ⚠️  ${warn.message}`);
      console.log(`     💡 ${warn.suggestion}`);
    });
  }
  
  console.log();
  console.log('='.repeat(70));
  if (mismatches.errors.length > 0) {
    console.log(`  ❌ 发现 ${mismatches.errors.length} 个错误，${mismatches.warnings.length} 个警告`);
    console.log('='.repeat(70) + '\n');
    process.exit(1);
  } else if (mismatches.warnings.length > 0) {
    console.log(`  ⚠️  发现 ${mismatches.warnings.length} 个警告`);
  } else {
    console.log('  ✅ 前后端接口完全对齐！');
  }
  console.log('='.repeat(70) + '\n');
}

function main() {
  if (!fs.existsSync(BACKEND_FILE)) {
    console.error(`❌ 后端文件不存在: ${BACKEND_FILE}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(FRONTEND_API_FILE)) {
    console.error(`❌ 前端API文件不存在: ${FRONTEND_API_FILE}`);
    process.exit(1);
  }
  
  const backendContent = fs.readFileSync(BACKEND_FILE, 'utf-8');
  const frontendContent = fs.readFileSync(FRONTEND_API_FILE, 'utf-8');
  
  const backendRoutes = extractBackendRoutes(backendContent);
  const frontendApis = extractFrontendApis(frontendContent);
  const mismatches = findMismatches(backendRoutes, frontendApis);
  
  printReport(backendRoutes, frontendApis, mismatches);
}

main();
