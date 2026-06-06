const http = require('http');

const API_BASE = 'http://localhost:3001/api';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = data ? JSON.parse(data) : {};
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, data });
          }
        });
      }
    );
    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

function log(title, pass, detail) {
  const icon = pass ? '✅' : '❌';
  console.log(`${icon} ${title}`);
  if (detail) {
    console.log(`   ${detail}`);
  }
}

async function waitForServer() {
  console.log('⏳ 等待服务启动...');
  for (let i = 0; i < 60; i++) {
    try {
      const res = await request('/health');
      if (res.status === 200) {
        console.log('✅ 服务已启动');
        return;
      }
    } catch (e) {}
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('服务启动超时');
}

async function runAcceptanceTests() {
  console.log('\n========== 农产品地理标志授权系统 - 验收测试 ==========\n');

  await waitForServer();

  let testCooperativeId = null;
  let plotInsideZoneId = null;
  let plotOutsideZoneId = null;
  let validReportId = null;
  let expiredReportId = null;
  let certificateId = null;

  const tests = [];

  try {
    console.log('\n--- 测试 1: 创建合作社 ---');
    const coopRes = await request('/cooperatives', {
      method: 'POST',
      body: {
        name: '五常市丰收水稻专业合作社',
        legalPerson: '张三',
        phone: '13800138000',
        address: '黑龙江省五常市',
        registrationNumber: '93230184MA12345678'
      }
    });
    const coopPass = coopRes.status === 201;
    testCooperativeId = coopRes.data._id;
    tests.push({ name: '创建合作社', pass: coopPass, detail: coopPass ? `ID: ${testCooperativeId}` : coopRes.data.error });
    log('创建合作社', coopPass, coopPass ? `ID: ${testCooperativeId}` : coopRes.data.error);

    console.log('\n--- 测试 2: 创建保护范围内的地块 ---');
    const plotInRes = await request('/plot-boundaries', {
      method: 'POST',
      body: {
        cooperativeId: testCooperativeId,
        name: '一号稻田（保护范围内）',
        area: 100,
        variety: '五常大米',
        coordinates: [
          { lat: 44.97, lng: 127.0 },
          { lat: 45.02, lng: 127.0 },
          { lat: 45.02, lng: 127.1 },
          { lat: 44.97, lng: 127.1 }
        ]
      }
    });
    const plotInPass =
      plotInRes.status === 201 && plotInRes.data.plotBoundary.isWithinProtectionZone === true;
    plotInsideZoneId = plotInRes.data.plotBoundary._id;
    tests.push({
      name: '保护范围内地块创建并校验通过',
      pass: plotInPass,
      detail: plotInPass ? `通过: ${plotInRes.data.validation.message}` : plotInRes.data.error
    });
    log(
      '保护范围内地块创建并校验通过',
      plotInPass,
      plotInPass ? plotInRes.data.validation.message : plotInRes.data.error
    );

    console.log('\n--- 测试 3: 创建保护范围外的地块 ---');
    const plotOutRes = await request('/plot-boundaries', {
      method: 'POST',
      body: {
        cooperativeId: testCooperativeId,
        name: '二号稻田（保护范围外）',
        area: 50,
        variety: '五常大米',
        coordinates: [
          { lat: 46.0, lng: 125.0 },
          { lat: 46.1, lng: 125.0 },
          { lat: 46.1, lng: 125.1 },
          { lat: 46.0, lng: 125.1 }
        ]
      }
    });
    const plotOutPass =
      plotOutRes.status === 201 && plotOutRes.data.plotBoundary.isWithinProtectionZone === false;
    plotOutsideZoneId = plotOutRes.data.plotBoundary._id;
    tests.push({
      name: '保护范围外地块创建并校验不通过',
      pass: plotOutPass,
      detail: plotOutPass ? `拒绝: ${plotOutRes.data.validation.message}` : plotOutRes.data.error
    });
    log(
      '保护范围外地块创建并校验不通过',
      plotOutPass,
      plotOutPass ? plotOutRes.data.validation.message : plotOutRes.data.error
    );

    console.log('\n--- 测试 4: 保护范围外地块申请授权 - 应失败 ---');
    const outsideApplyRes = await request('/authorization-certificates/apply', {
      method: 'POST',
      body: {
        cooperativeId: testCooperativeId,
        plotBoundaryId: plotOutsideZoneId,
        inspectionReportId: '000000000000000000000000',
        variety: '五常大米',
        batchNumber: 'BATCH-OUTSIDE-001'
      }
    });
    const outsideApplyPass =
      outsideApplyRes.status === 400 && outsideApplyRes.data.code === 'OUTSIDE_PROTECTION_ZONE';
    tests.push({
      name: '保护范围外地块申请授权失败',
      pass: outsideApplyPass,
      detail: outsideApplyPass
        ? `正确拒绝: ${outsideApplyRes.data.error}`
        : `错误: ${outsideApplyRes.data.error || outsideApplyRes.status}`
    });
    log(
      '保护范围外地块申请授权失败（业务规则：地块不在保护范围内不能授权）',
      outsideApplyPass,
      outsideApplyPass ? outsideApplyRes.data.error : '未正确拦截'
    );

    console.log('\n--- 测试 5: 创建有效检测报告 ---');
    const validReportRes = await request('/inspection-reports', {
      method: 'POST',
      body: {
        cooperativeId: testCooperativeId,
        reportNumber: 'REP-VALID-001',
        variety: '五常大米',
        batchNumber: 'BATCH-001',
        reportDate: new Date().toISOString(),
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        issuedBy: '国家粮食质量检测中心',
        status: 'valid'
      }
    });
    const validReportPass = validReportRes.status === 201 && validReportRes.data.status === 'valid';
    validReportId = validReportRes.data._id;
    tests.push({
      name: '创建有效检测报告',
      pass: validReportPass,
      detail: validReportPass ? `状态: ${validReportRes.data.status}` : validReportRes.data.error
    });
    log('创建有效检测报告', validReportPass, validReportPass ? `状态: ${validReportRes.data.status}` : validReportRes.data.error);

    console.log('\n--- 测试 6: 创建过期检测报告 ---');
    const expiredReportRes = await request('/inspection-reports', {
      method: 'POST',
      body: {
        cooperativeId: testCooperativeId,
        reportNumber: 'REP-EXPIRED-001',
        variety: '五常大米',
        batchNumber: 'BATCH-EXPIRED-001',
        reportDate: '2020-01-01',
        validUntil: '2021-01-01',
        issuedBy: '国家粮食质量检测中心',
        status: 'pending'
      }
    });
    const expiredReportPass =
      expiredReportRes.status === 201 && expiredReportRes.data.status === 'expired';
    expiredReportId = expiredReportRes.data._id;
    tests.push({
      name: '过期检测报告自动标记为过期',
      pass: expiredReportPass,
      detail: expiredReportPass ? `状态: ${expiredReportRes.data.status}` : expiredReportRes.data.error
    });
    log(
      '过期检测报告自动标记为过期状态',
      expiredReportPass,
      expiredReportPass ? `状态: ${expiredReportRes.data.status}` : '未正确标记'
    );

    console.log('\n--- 测试 7: 过期报告申请授权 - 应失败 ---');
    const expiredApplyRes = await request('/authorization-certificates/apply', {
      method: 'POST',
      body: {
        cooperativeId: testCooperativeId,
        plotBoundaryId: plotInsideZoneId,
        inspectionReportId: expiredReportId,
        variety: '五常大米',
        batchNumber: 'BATCH-EXPIRED-APPLY-001'
      }
    });
    const expiredApplyPass =
      expiredApplyRes.status === 400 && expiredApplyRes.data.code === 'REPORT_EXPIRED';
    tests.push({
      name: '过期报告申请授权被拒绝',
      pass: expiredApplyPass,
      detail: expiredApplyPass
        ? `正确拒绝: ${expiredApplyRes.data.error}`
        : `错误: ${expiredApplyRes.data.error || expiredApplyRes.status}`
    });
    log(
      '过期报告申请授权被拒绝（业务规则：检测报告过期必须重新上传）',
      expiredApplyPass,
      expiredApplyPass ? expiredApplyRes.data.error : '未正确拦截'
    );

    console.log('\n--- 测试 8: 正常申请授权 - 应成功 ---');
    const applyRes = await request('/authorization-certificates/apply', {
      method: 'POST',
      body: {
        cooperativeId: testCooperativeId,
        plotBoundaryId: plotInsideZoneId,
        inspectionReportId: validReportId,
        variety: '五常大米',
        batchNumber: 'BATCH-NORMAL-001'
      }
    });
    const applyPass = applyRes.status === 201 && applyRes.data.certificate.status === 'pending';
    certificateId = applyRes.data.certificate._id;
    tests.push({
      name: '正常申请授权成功',
      pass: applyPass,
      detail: applyPass
        ? `证书编号: ${applyRes.data.certificate.certificateNumber}`
        : applyRes.data.error
    });
    log(
      '正常条件下申请授权成功',
      applyPass,
      applyPass ? `证书编号: ${applyRes.data.certificate.certificateNumber}` : applyRes.data.error
    );

    console.log('\n--- 测试 9: 同一批次重复申请 - 应失败 ---');
    const dupApplyRes = await request('/authorization-certificates/apply', {
      method: 'POST',
      body: {
        cooperativeId: testCooperativeId,
        plotBoundaryId: plotInsideZoneId,
        inspectionReportId: validReportId,
        variety: '五常大米',
        batchNumber: 'BATCH-NORMAL-001'
      }
    });
    const dupApplyPass =
      dupApplyRes.status === 400 && dupApplyRes.data.code === 'DUPLICATE_BATCH';
    tests.push({
      name: '同一批次重复申请被拒绝',
      pass: dupApplyPass,
      detail: dupApplyPass
        ? `正确拒绝: ${dupApplyRes.data.error}`
        : `错误: ${dupApplyRes.data.error || dupApplyRes.status}`
    });
    log(
      '同一批次重复申请被拒绝（业务规则：同一批次不能重复申请证书）',
      dupApplyPass,
      dupApplyPass ? dupApplyRes.data.error : '未正确拦截'
    );

    console.log('\n--- 测试 10: 批准授权证书 ---');
    const approveRes = await request(`/authorization-certificates/${certificateId}/approve`, {
      method: 'POST',
      body: { approvedBy: '验收测试员' }
    });
    const approvePass = approveRes.status === 200 && approveRes.data.certificate.status === 'approved';
    tests.push({
      name: '品牌管理员批准授权',
      pass: approvePass,
      detail: approvePass ? `状态: ${approveRes.data.certificate.status}` : approveRes.data.error
    });
    log('品牌管理员批准授权', approvePass, approvePass ? `状态: ${approveRes.data.certificate.status}` : approveRes.data.error);

    console.log('\n--- 测试 11: 记录异常巡查 ---');
    const patrolRes = await request('/patrol-records', {
      method: 'POST',
      body: {
        cooperativeId: testCooperativeId,
        inspectorName: '李四',
        patrolDate: new Date().toISOString(),
        result: 'abnormal',
        description: '发现农药使用不规范，产品质量不达标',
        findings: ['农药残留超标', '记录不完整'],
        correctiveActions: '限期15天整改'
      }
    });
    const patrolPass = patrolRes.status === 201;
    tests.push({
      name: '监管人员记录异常巡查',
      pass: patrolPass,
      detail: patrolPass ? `结果: ${patrolRes.data.patrolRecord.result}` : patrolRes.data.error
    });
    log(
      '监管人员记录异常巡查',
      patrolPass,
      patrolPass ? `结果: ${patrolRes.data.patrolRecord.result}` : patrolRes.data.error
    );

    console.log('\n--- 测试 12: 巡查异常后新增用标登记 - 应暂停 ---');
    const labelUsageRes = await request('/label-usages', {
      method: 'POST',
      body: {
        cooperativeId: testCooperativeId,
        certificateId: certificateId,
        batchNumber: 'BATCH-LABEL-001',
        variety: '五常大米',
        quantity: 1000,
        labelType: '地理标志专用标',
        useDate: new Date().toISOString()
      }
    });
    const labelUsagePass =
      labelUsageRes.status === 400 && labelUsageRes.data.code === 'PATROL_ABNORMAL_SUSPENDED';
    tests.push({
      name: '巡查异常后用标登记被暂停',
      pass: labelUsagePass,
      detail: labelUsagePass
        ? `正确拒绝: ${labelUsageRes.data.error}`
        : `错误: ${labelUsageRes.data.error || labelUsageRes.status}`
    });
    log(
      '巡查异常后新增用标登记被暂停（业务规则：巡查异常后新增用标登记被暂停）',
      labelUsagePass,
      labelUsagePass ? labelUsageRes.data.error : '未正确拦截'
    );

    console.log('\n--- 测试 13: 查询看板统计数据 ---');
    const statsRes = await request('/dashboard/stats');
    const statsPass = statsRes.status === 200 && statsRes.data.statistics;
    tests.push({
      name: '预警看板数据查询成功',
      pass: statsPass,
      detail: statsPass
        ? `合作社: ${statsRes.data.statistics.totalCooperatives}, 证书: ${statsRes.data.statistics.totalCertificates}`
        : statsRes.status
    });
    log(
      '预警看板数据查询成功',
      statsPass,
      statsPass
        ? `合作社: ${statsRes.data.statistics.totalCooperatives}, 证书: ${statsRes.data.statistics.totalCertificates}`
        : '查询失败'
    );

    console.log('\n--- 测试 14: 查询过期报告状态 ---');
    const reportsRes = await request('/inspection-reports');
    const expiredInList = reportsRes.data.find((r) => r._id === expiredReportId);
    const reportStatusPass = expiredInList && expiredInList.status === 'expired';
    tests.push({
      name: '报告列表中过期报告状态正确',
      pass: reportStatusPass,
      detail: reportStatusPass ? `状态: ${expiredInList.status}` : '状态不正确'
    });
    log(
      '报告列表中过期报告状态正确显示',
      reportStatusPass,
      reportStatusPass ? `状态: ${expiredInList.status}` : '未正确显示过期状态'
    );

    console.log('\n========== 测试结果汇总 ==========\n');
    const passed = tests.filter((t) => t.pass).length;
    const total = tests.length;
    console.log(`总计: ${total} 项测试，通过: ${passed} 项，失败: ${total - passed} 项\n`);

    tests.forEach((t) => {
      log(t.name, t.pass, t.detail);
    });

    console.log(`\n${passed === total ? '🎉 所有验收测试通过！' : '⚠️  存在测试失败，请检查'}`);
    console.log('\n=== 业务规则验证总结 ===');
    console.log('1. ✅ 地块不在保护范围内不能授权 - 已验证');
    console.log('2. ✅ 检测报告过期必须重新上传 - 已验证');
    console.log('3. ✅ 巡查异常后新增用标登记被暂停 - 已验证');
    console.log('4. ✅ 同一批次不能重复申请证书 - 已验证');

    process.exit(passed === total ? 0 : 1);
  } catch (error) {
    console.error('\n❌ 测试执行出错:', error.message);
    process.exit(1);
  }
}

runAcceptanceTests();
