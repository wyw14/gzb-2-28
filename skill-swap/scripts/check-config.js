#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const ROOT_DIR = path.resolve(__dirname, '..');
const ENVIRONMENTS = ['development', 'test', 'production'];

const REQUIRED_CONFIGS = [
  { key: 'BACKEND_PORT', type: 'number', required: true },
  { key: 'BACKEND_HOST', type: 'string', required: true },
  { key: 'BACKEND_PROTOCOL', type: 'string', required: true, enum: ['http', 'https'] },
  { key: 'FRONTEND_PORT', type: 'number', required: true },
  { key: 'FRONTEND_HOST', type: 'string', required: true },
  { key: 'FRONTEND_PROTOCOL', type: 'string', required: true, enum: ['http', 'https'] },
  { key: 'API_PREFIX', type: 'string', required: true },
  { key: 'JWT_SECRET', type: 'string', required: true },
  { key: 'JWT_EXPIRES_IN', type: 'string', required: true },
  { key: 'NODE_ENV', type: 'string', required: true, enum: ['development', 'test', 'production'] },
];

function loadEnvFile(envName) {
  const envPath = path.join(ROOT_DIR, `.env.${envName}`);
  if (!fs.existsSync(envPath)) {
    return { exists: false, config: {} };
  }
  const parsed = dotenv.parse(fs.readFileSync(envPath));
  return { exists: true, config: parsed };
}

function parseValue(value, type) {
  if (value === undefined || value === null || value === '') return null;
  switch (type) {
    case 'number':
      const num = parseInt(value, 10);
      return isNaN(num) ? null : num;
    case 'boolean':
      return value === 'true' || value === '1';
    default:
      return value;
  }
}

function validateConfig(config, envName) {
  const errors = [];
  const warnings = [];

  REQUIRED_CONFIGS.forEach(({ key, type, required, enum: enumValues }) => {
    const value = config[key];
    const parsed = parseValue(value, type);

    if (required && (value === undefined || value === '' || parsed === null)) {
      if (envName === 'production' && key === 'JWT_SECRET') {
        errors.push(`[${envName}] ${key}: 生产环境必须设置该值，请勿留空`);
      } else if (value !== '') {
        errors.push(`[${envName}] ${key}: 必填项缺失或格式错误`);
      }
    }

    if (enumValues && value && !enumValues.includes(value)) {
      errors.push(`[${envName}] ${key}: 值必须是 ${enumValues.join(', ')} 之一`);
    }

    if (key === 'JWT_SECRET' && envName === 'production' && value === 'skill-swap-secret-key-2024') {
      warnings.push(`[${envName}] ${key}: 生产环境请勿使用默认密钥！`);
    }
  });

  return { errors, warnings };
}

function checkConsistency(allConfigs) {
  const inconsistencies = [];
  
  const apiPrefixes = new Set();
  ENVIRONMENTS.forEach(env => {
    if (allConfigs[env]?.config?.API_PREFIX) {
      apiPrefixes.add(allConfigs[env].config.API_PREFIX);
    }
  });
  if (apiPrefixes.size > 1) {
    inconsistencies.push({
      type: 'warning',
      message: `不同环境的 API_PREFIX 不一致: ${Array.from(apiPrefixes).join(', ')}`,
      suggestion: '建议保持各环境 API_PREFIX 一致，避免部署时修改代码'
    });
  }

  return inconsistencies;
}

function printReport(results, envsToCheck) {
  console.log('\n' + '='.repeat(70));
  console.log('  配置检查报告');
  console.log('='.repeat(70) + '\n');

  let hasErrors = false;
  let totalWarnings = 0;

  envsToCheck.forEach(env => {
    const result = results[env];
    console.log(`[${env.toUpperCase()}] 环境`);
    console.log('-'.repeat(70));

    if (!result.exists) {
      console.log(`  ⚠️  配置文件不存在: .env.${env}`);
      console.log();
      return;
    }

    if (result.validation.errors.length === 0 && result.validation.warnings.length === 0) {
      console.log(`  ✅ 配置验证通过`);
    }

    result.validation.errors.forEach(err => {
      console.log(`  ❌ ${err}`);
      hasErrors = true;
    });

    result.validation.warnings.forEach(warn => {
      console.log(`  ⚠️  ${warn}`);
      totalWarnings++;
    });

    console.log();
  });

  if (results.consistency.length > 0) {
    console.log('跨环境一致性检查');
    console.log('-'.repeat(70));
    results.consistency.forEach(item => {
      const icon = item.type === 'error' ? '❌' : '⚠️ ';
      console.log(`  ${icon} ${item.message}`);
      if (item.suggestion) {
        console.log(`     💡 ${item.suggestion}`);
      }
      if (item.type === 'error') hasErrors = true;
      totalWarnings++;
    });
    console.log();
  }

  console.log('='.repeat(70));
  if (hasErrors) {
    console.log('  ❌ 检查失败，请修复上述错误后再继续');
    console.log('='.repeat(70) + '\n');
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log(`  ⚠️  检查通过，但有 ${totalWarnings} 个警告需要注意`);
  } else {
    console.log('  ✅ 所有检查通过！');
  }
  console.log('='.repeat(70) + '\n');
}

function main() {
  const targetEnv = process.argv[2];
  const envsToCheck = targetEnv && ENVIRONMENTS.includes(targetEnv) 
    ? [targetEnv] 
    : ENVIRONMENTS;

  const results = {};
  const allConfigs = {};

  envsToCheck.forEach(env => {
    const { exists, config } = loadEnvFile(env);
    allConfigs[env] = { exists, config };
    results[env] = {
      exists,
      config,
      validation: exists ? validateConfig(config, env) : { errors: [], warnings: [] }
    };
  });

  results.consistency = checkConsistency(allConfigs);
  printReport(results, envsToCheck);
}

main();
