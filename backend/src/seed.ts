import ProtectionZone from './models/ProtectionZone';

export const seedProtectionZones = async () => {
  const existing = await ProtectionZone.countDocuments();
  if (existing > 0) {
    console.log('保护范围数据已存在，跳过初始化');
    return;
  }

  const zones = [
    {
      name: '五常大米核心保护区',
      code: 'WCDM-001',
      variety: '五常大米',
      boundary: [
        { lat: 44.95, lng: 126.95 },
        { lat: 45.05, lng: 126.95 },
        { lat: 45.05, lng: 127.15 },
        { lat: 44.95, lng: 127.15 },
        { lat: 44.95, lng: 126.95 }
      ],
      description: '黑龙江省五常市核心产稻区',
      isActive: true
    },
    {
      name: '西湖龙井茶一级保护区',
      code: 'XHLC-001',
      variety: '西湖龙井',
      boundary: [
        { lat: 30.18, lng: 120.05 },
        { lat: 30.28, lng: 120.05 },
        { lat: 30.28, lng: 120.15 },
        { lat: 30.18, lng: 120.15 },
        { lat: 30.18, lng: 120.05 }
      ],
      description: '杭州西湖风景名胜区产茶区',
      isActive: true
    }
  ];

  await ProtectionZone.insertMany(zones);
  console.log('✅ 保护范围数据初始化完成');
};
