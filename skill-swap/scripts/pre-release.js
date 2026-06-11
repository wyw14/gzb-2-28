#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SCRIPTS_DIR = path.join(ROOT_DIR, 'scripts');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function logStep(step, total, title) {
  console.log(`\n${COLORS.cyan}[${step}/${total}] ${title}${COLORS.reset}`);
  console.log('-'.repeat(70));
}

function logSuccess(message) {
  console.log(`${COLORS.green}✅ ${message}${COLORS.reset}`);
}

function logError(message) {
  console.log(`${COLORS.red}❌ ${message}${COLORS.reset}`);
}

function logWarning(message) {
  console.log(`${COLORS.yellow}⚠️  ${message}${COLORS.reset}`);
}

function logInfo(message) {
  console.log(`${COLORS.blue}ℹ️  ${message}${COLORS.reset}`);
}

function runScript(scriptPath, description, options = {}) {
  const { env = process.env.NODE_ENV || 'development', strict = true } = options;
  
  try {
    console.log(`执行: node ${path.basename(scriptPath)} ${env !== 'all' ? env : ''}`);
    execSync(`node "${scriptPath}" ${env !== 'all' ? env : ''}`, {
      stdio: 'inherit',
      cwd: ROOT_DIR,
      env: { ...process.env, NODE_ENV: env }
    });
    return true;
  } catch (error) {
    if (strict) {
      logError(`${description} 失败，终止发布流程`);
      process.exit(1);
    } else {
      logWarning(`${description} 发现问题，但继续执行`);
      return false;
    }
  }
}

function checkDependencies() {
  logInfo('检查项目依赖...');
  
  const checkPath = (dir) => {
    const pkgPath = path.join(ROOT_DIR, dir, 'package.json');
    const nodeModulesPath = path.join(ROOT_DIR, dir, 'node_modules');
    
    if (fs.existsSync(pkgPath) && !fs.existsSync(nodeModulesPath)) {
      logWarning(`${dir} 依赖未安装，正在执行 npm install...`);
      try {
        execSync('npm install', { cwd: path.join(ROOT_DIR, dir), stdio: 'inherit' });
        logSuccess(`${dir} 依赖安装完成`);
      } catch (error) {
        logError(`${dir} 依赖安装失败`);
        process.exit(1);
      }
    }
  };
  
  checkPath('backend');
  checkPath('frontend');
  checkPath('scripts');
  
  logSuccess('依赖检查完成');
}

function checkGitStatus() {
  logInfo('检查 Git 状态...');
  
  try {
    const status = execSync('git status --porcelain', { cwd: ROOT_DIR, encoding: 'utf-8' }).trim();
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT_DIR, encoding: 'utf-8' }).trim();
    
    console.log(`当前分支: ${branch}`);
    
    if (status) {
      logWarning('工作区有未提交的更改:');
      console.log(status);
      console.log();
      
      if (branch === 'main' || branch === 'master') {
        logError('主分支存在未提交更改，建议先提交或暂存');
        process.exit(1);
      }
    } else {
      logSuccess('工作区干净');
    }
  } catch (error) {
    logWarning('非 Git 仓库或 Git 命令不可用，跳过 Git 检查');
  }
}

function runBuild(env) {
  logInfo(`执行 ${env} 环境构建...`);
  
  const frontendDir = path.join(ROOT_DIR, 'frontend');
  
  try {
    console.log('前端构建: npm run build');
    execSync('npm run build', {
      cwd: frontendDir,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: env }
    });
    logSuccess('前端构建完成');
  } catch (error) {
    logError('前端构建失败');
    process.exit(1);
  }
}

function printSummary(env, results) {
  console.log('\n' + '='.repeat(70));
  console.log(`${COLORS.bold}  发布前验证总结 - ${env.toUpperCase()} 环境${COLORS.reset}`);
  console.log('='.repeat(70) + '\n');
  
  let passed = 0;
  let failed = 0;
  let warnings = 0;
  
  results.forEach(result => {
    if (result.passed) {
      console.log(`  ${COLORS.green}✅${COLORS.reset} ${result.name}`);
      passed++;
    } else if (result.strict) {
      console.log(`  ${COLORS.red}❌${COLORS.reset} ${result.name}`);
      failed++;
    } else {
      console.log(`  ${COLORS.yellow}⚠️ ${COLORS.reset} ${result.name}`);
      warnings++;
    }
  });
  
  console.log();
  console.log(`  通过: ${passed}  失败: ${failed}  警告: ${warnings}`);
  console.log();
  
  if (failed > 0) {
    console.log(`${COLORS.red}${COLORS.bold}  ❌ 验证失败，禁止发布！${COLORS.reset}`);
    console.log(`${COLORS.red}     请修复上述问题后重新验证。${COLORS.reset}`);
    console.log('='.repeat(70) + '\n');
    process.exit(1);
  } else if (warnings > 0) {
    console.log(`${COLORS.yellow}${COLORS.bold}  ⚠️  验证通过，但有 ${warnings} 个警告需要注意${COLORS.reset}`);
    console.log('='.repeat(70) + '\n');
  } else {
    console.log(`${COLORS.green}${COLORS.bold}  ✅ 所有验证通过，可以安全发布！${COLORS.reset}`);
    console.log('='.repeat(70) + '\n');
  }
}

function showUsage() {
  console.log(`
${COLORS.bold}发布前验证脚本${COLORS.reset}

用法:
  node scripts/pre-release.js [环境] [选项]

环境:
  development    开发环境（默认）
  test           测试环境
  production     生产环境
  all            检查所有环境配置

选项:
  --skip-build   跳过前端构建
  --skip-git     跳过 Git 检查
  --non-strict   非严格模式，遇到警告不终止
  -h, --help     显示帮助信息

示例:
  node scripts/pre-release.js production
  node scripts/pre-release.js test --skip-build
  `);
}

function main() {
  const args = process.argv.slice(2);
  const validEnvs = ['development', 'test', 'production', 'all'];
  
  let env = 'development';
  let skipBuild = false;
  let skipGit = false;
  let strict = true;
  
  for (const arg of args) {
    if (arg === '-h' || arg === '--help') {
      showUsage();
      process.exit(0);
    } else if (arg === '--skip-build') {
      skipBuild = true;
    } else if (arg === '--skip-git') {
      skipGit = true;
    } else if (arg === '--non-strict') {
      strict = false;
    } else if (validEnvs.includes(arg)) {
      env = arg;
    } else {
      console.log(`${COLORS.red}未知参数: ${arg}${COLORS.reset}`);
      showUsage();
      process.exit(1);
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log(`${COLORS.bold}${COLORS.cyan}  🚀 Skill Swap 发布前验证流程${COLORS.reset}`);
  console.log(`  环境: ${env.toUpperCase()}`);
  console.log(`  时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log('='.repeat(70));
  
  const results = [];
  const totalSteps = (skipGit ? 0 : 1) + (skipBuild ? 0 : 1) + 3;
  let currentStep = 0;
  
  if (!skipGit) {
    currentStep++;
    logStep(currentStep, totalSteps, 'Git 状态检查');
    try {
      checkGitStatus();
      results.push({ name: 'Git 状态检查', passed: true, strict: true });
    } catch (error) {
      results.push({ name: 'Git 状态检查', passed: false, strict: true });
    }
  }
  
  currentStep++;
  logStep(currentStep, totalSteps, '依赖检查与安装');
  try {
    checkDependencies();
    results.push({ name: '依赖检查与安装', passed: true, strict: true });
  } catch (error) {
    results.push({ name: '依赖检查与安装', passed: false, strict: true });
  }
  
  currentStep++;
  logStep(currentStep, totalSteps, '配置一致性检查');
  const configPassed = runScript(
    path.join(SCRIPTS_DIR, 'check-config.js'),
    '配置一致性检查',
    { env, strict }
  );
  results.push({ name: '配置一致性检查', passed: configPassed, strict });
  
  currentStep++;
  logStep(currentStep, totalSteps, '前后端接口对齐检查');
  const apiPassed = runScript(
    path.join(SCRIPTS_DIR, 'check-api.js'),
    '前后端接口对齐检查',
    { env, strict: false }
  );
  results.push({ name: '前后端接口对齐检查', passed: apiPassed, strict: false });
  
  if (!skipBuild) {
    currentStep++;
    logStep(currentStep, totalSteps, '前端构建验证');
    try {
      runBuild(env);
      results.push({ name: '前端构建验证', passed: true, strict: true });
    } catch (error) {
      results.push({ name: '前端构建验证', passed: false, strict: true });
    }
  }
  
  printSummary(env, results);
}

main();
