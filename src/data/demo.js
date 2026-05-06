// ═══════════════════════════════════════════════
// DEMO DATA - PHASE 1
// ═══════════════════════════════════════════════

export const DEMO_BRANDS = [
  { id: 'b1', name: 'Nike', logo: '👟', category: 'Deportes', description: 'Líder mundial en calzado y ropa deportiva de alto rendimiento.', status: 'active', contactPerson: 'Carlos Méndez', email: 'carlos@nike.com', phone: '+54 11 4000-1234', website: 'https://nike.com', contractType: 'premium', startDate: '2024-01-15', endDate: '2025-01-15', locationsCount: 3, benefitsCount: 12, codesCount: 450, createdAt: '2024-01-15T10:00:00Z', createdBy: 'Admin' },
  { id: 'b2', name: 'Adidas', logo: '⚽', category: 'Deportes', description: 'Marca global de ropa deportiva con enfoque en innovación y sostenibilidad.', status: 'active', contactPerson: 'Sofía Ruiz', email: 'sofia@adidas.com', phone: '+54 11 4000-5678', website: 'https://adidas.com', contractType: 'standard', startDate: '2024-02-01', endDate: '2025-02-01', locationsCount: 2, benefitsCount: 8, codesCount: 320, createdAt: '2024-02-01T10:00:00Z', createdBy: 'Admin' },
  { id: 'b3', name: 'Puma', logo: '🐆', category: 'Deportes', description: 'Marca deportiva con fusión perfecta entre deporte y moda urbana.', status: 'active', contactPerson: 'Martín López', email: 'martin@puma.com', phone: '+54 11 4000-9012', website: 'https://puma.com', contractType: 'standard', startDate: '2024-03-01', endDate: '2025-03-01', locationsCount: 2, benefitsCount: 6, codesCount: 180, createdAt: '2024-03-01T10:00:00Z', createdBy: 'Admin' },
  { id: 'b4', name: 'Reebok', logo: '🏋️', category: 'Fitness', description: 'Especialistas en calzado y ropa para fitness y entrenamiento funcional.', status: 'inactive', contactPerson: 'Ana García', email: 'ana@reebok.com', phone: '+54 11 4000-3456', website: 'https://reebok.com', contractType: 'basic', startDate: '2024-01-01', endDate: '2024-12-31', locationsCount: 2, benefitsCount: 4, codesCount: 90, createdAt: '2024-01-01T10:00:00Z', createdBy: 'Admin' },
  { id: 'b5', name: 'Under Armour', logo: '💪', category: 'Fitness', description: 'Tecnología de rendimiento deportivo de primer nivel para atletas.', status: 'active', contactPerson: 'Diego Torres', email: 'diego@ua.com', phone: '+54 11 4000-7890', website: 'https://underarmour.com', contractType: 'premium', startDate: '2024-04-01', endDate: '2025-04-01', locationsCount: 1, benefitsCount: 10, codesCount: 275, createdAt: '2024-04-01T10:00:00Z', createdBy: 'Admin' }
]

export const DEMO_LOCATIONS = [
  { id: 'l1', brandId: 'b1', name: 'Nike Palermo', address: 'Av. Santa Fe 3253', city: 'Buenos Aires', state: 'CABA', country: 'Argentina', zipCode: 'C1425', coordinates: { lat: -34.5875, lng: -58.4204 }, phone: '+54 11 4800-1111', manager: 'Roberto Silva', hours: 'Lun-Sáb 10-21 / Dom 12-20', status: 'active', codesAssigned: 150, stats: { visits: 1240, conversions: 89, revenue: 45000 }, createdAt: '2024-01-15T10:00:00Z' },
  { id: 'l2', brandId: 'b1', name: 'Nike Microcentro', address: 'Florida 234', city: 'Buenos Aires', state: 'CABA', country: 'Argentina', zipCode: 'C1005', coordinates: { lat: -34.6037, lng: -58.3736 }, phone: '+54 11 4800-2222', manager: 'Laura Vega', hours: 'Lun-Vie 9-20 / Sáb 10-18', status: 'active', codesAssigned: 180, stats: { visits: 2100, conversions: 156, revenue: 78000 }, createdAt: '2024-01-20T10:00:00Z' },
  { id: 'l3', brandId: 'b1', name: 'Nike Unicenter', address: 'Paraná 3745, Martínez', city: 'Martínez', state: 'Buenos Aires', country: 'Argentina', zipCode: 'B1640', coordinates: { lat: -34.4896, lng: -58.5119 }, phone: '+54 11 4800-3333', manager: 'Pablo Moreno', hours: 'Todos los días 10-22', status: 'active', codesAssigned: 120, stats: { visits: 980, conversions: 67, revenue: 32000 }, createdAt: '2024-02-01T10:00:00Z' },
  { id: 'l4', brandId: 'b2', name: 'Adidas Alto Palermo', address: 'Av. Santa Fe 3253 L.34', city: 'Buenos Aires', state: 'CABA', country: 'Argentina', zipCode: 'C1425', coordinates: { lat: -34.5879, lng: -58.4211 }, phone: '+54 11 4900-1111', manager: 'Fernanda Castro', hours: 'Lun-Sáb 10-21 / Dom 12-20', status: 'active', codesAssigned: 160, stats: { visits: 1560, conversions: 112, revenue: 56000 }, createdAt: '2024-02-01T10:00:00Z' },
  { id: 'l5', brandId: 'b2', name: 'Adidas Abasto', address: 'Av. Corrientes 3247', city: 'Buenos Aires', state: 'CABA', country: 'Argentina', zipCode: 'C1193', coordinates: { lat: -34.6048, lng: -58.4109 }, phone: '+54 11 4900-2222', manager: 'Nicolás Pérez', hours: 'Todos los días 10-22', status: 'active', codesAssigned: 160, stats: { visits: 1320, conversions: 95, revenue: 48000 }, createdAt: '2024-02-15T10:00:00Z' },
  { id: 'l6', brandId: 'b3', name: 'Puma Recoleta', address: 'Av. Las Heras 2141', city: 'Buenos Aires', state: 'CABA', country: 'Argentina', zipCode: 'C1127', coordinates: { lat: -34.5849, lng: -58.3927 }, phone: '+54 11 5000-1111', manager: 'Valeria Jiménez', hours: 'Lun-Sáb 10-20', status: 'active', codesAssigned: 90, stats: { visits: 760, conversions: 48, revenue: 22000 }, createdAt: '2024-03-01T10:00:00Z' },
  { id: 'l7', brandId: 'b3', name: 'Puma Belgrano', address: 'Cabildo 2175', city: 'Buenos Aires', state: 'CABA', country: 'Argentina', zipCode: 'C1428', coordinates: { lat: -34.5622, lng: -58.4581 }, phone: '+54 11 5000-2222', manager: 'Gustavo Herrera', hours: 'Lun-Sáb 10-20 / Dom 12-18', status: 'active', codesAssigned: 90, stats: { visits: 680, conversions: 41, revenue: 19000 }, createdAt: '2024-03-10T10:00:00Z' },
  { id: 'l8', brandId: 'b4', name: 'Reebok Córdoba', address: 'Av. Colón 456', city: 'Córdoba', state: 'Córdoba', country: 'Argentina', zipCode: 'X5000', coordinates: { lat: -31.4201, lng: -64.1888 }, phone: '+54 351 400-1111', manager: 'Claudia Romero', hours: 'Lun-Sáb 9-20', status: 'inactive', codesAssigned: 45, stats: { visits: 390, conversions: 22, revenue: 9800 }, createdAt: '2024-01-01T10:00:00Z' },
  { id: 'l9', brandId: 'b4', name: 'Reebok Rosario', address: 'Córdoba 1234', city: 'Rosario', state: 'Santa Fe', country: 'Argentina', zipCode: 'S2000', coordinates: { lat: -32.9587, lng: -60.6931 }, phone: '+54 341 400-2222', manager: 'Sergio Álvarez', hours: 'Lun-Sáb 9-20', status: 'inactive', codesAssigned: 45, stats: { visits: 310, conversions: 18, revenue: 7500 }, createdAt: '2024-01-15T10:00:00Z' },
  { id: 'l10', brandId: 'b5', name: 'Under Armour Puerto Madero', address: 'Av. Alicia Moreau de Justo 1020', city: 'Buenos Aires', state: 'CABA', country: 'Argentina', zipCode: 'C1107', coordinates: { lat: -34.6147, lng: -58.3671 }, phone: '+54 11 6000-1111', manager: 'Ramiro Blanco', hours: 'Lun-Dom 10-22', status: 'active', codesAssigned: 275, stats: { visits: 1890, conversions: 143, revenue: 82000 }, createdAt: '2024-04-01T10:00:00Z' }
]

// ═══════════════════════════════════════════════
// DEMO DATA - PHASE 2
// ═══════════════════════════════════════════════

export const DEMO_INFLUENCERS = [
  { id: 'inf1', name: 'María González', username: '@mariagonzalez', email: 'maria@influencer.com', phone: '+54 9 11 9876-5432', instagram: '@mariagonzalez', followers: 125000, category: 'Lifestyle', tier: 1, uniLink: 'MARIA2024', referrals: { total: 89, converted: 67, conversionRate: 75.28 }, contractType: 'monthly', rate: 45000, status: 'active', stats: { totalReach: 450000, engagement: 4.5, codesUsed: 234, revenueGenerated: 890000 }, createdAt: '2024-02-01T09:00:00Z' },
  { id: 'inf2', name: 'Lucas Pereyra', username: '@lucasfit', email: 'lucas@influencer.com', phone: '+54 9 11 8765-4321', instagram: '@lucasfit', followers: 89000, category: 'Fitness', tier: 2, uniLink: 'LUCAS2024', referrals: { total: 56, converted: 38, conversionRate: 67.86 }, contractType: 'per_post', rate: 18000, status: 'active', stats: { totalReach: 280000, engagement: 5.2, codesUsed: 156, revenueGenerated: 520000 }, createdAt: '2024-03-01T09:00:00Z' },
  { id: 'inf3', name: 'Valentina Ruiz', username: '@valerun', email: 'vale@influencer.com', phone: '+54 9 11 7654-3210', instagram: '@valerun', followers: 210000, category: 'Running', tier: 1, uniLink: 'VALE2024', referrals: { total: 134, converted: 102, conversionRate: 76.12 }, contractType: 'hybrid', rate: 65000, status: 'active', stats: { totalReach: 780000, engagement: 3.8, codesUsed: 389, revenueGenerated: 1450000 }, createdAt: '2024-01-15T09:00:00Z' },
  { id: 'inf4', name: 'Mateo Santos', username: '@mateoactive', email: 'mateo@influencer.com', phone: '+54 9 341 555-1234', instagram: '@mateoactive', followers: 45000, category: 'Lifestyle', tier: 3, uniLink: 'MATEO2024', referrals: { total: 28, converted: 18, conversionRate: 64.29 }, contractType: 'campaign', rate: 8000, status: 'active', stats: { totalReach: 145000, engagement: 6.1, codesUsed: 78, revenueGenerated: 230000 }, createdAt: '2024-04-01T09:00:00Z' },
  { id: 'inf5', name: 'Camila López', username: '@camilafitlife', email: 'camila@influencer.com', phone: '+54 9 351 444-5678', instagram: '@camilafitlife', followers: 78000, category: 'Fitness', tier: 2, uniLink: 'CAMI2024', referrals: { total: 67, converted: 45, conversionRate: 67.16 }, contractType: 'monthly', rate: 28000, status: 'active', stats: { totalReach: 340000, engagement: 4.9, codesUsed: 198, revenueGenerated: 670000 }, createdAt: '2024-02-15T09:00:00Z' },
  { id: 'inf6', name: 'Sebastián Herrera', username: '@sebherreras', email: 'seb@influencer.com', phone: '+54 9 11 6543-2109', instagram: '@sebherreras', followers: 32000, category: 'Sports Tech', tier: 3, uniLink: 'SEB2024', referrals: { total: 19, converted: 11, conversionRate: 57.89 }, contractType: 'per_post', rate: 5500, status: 'paused', stats: { totalReach: 98000, engagement: 3.2, codesUsed: 45, revenueGenerated: 145000 }, createdAt: '2024-05-01T09:00:00Z' },
  { id: 'inf7', name: 'Florencia Torres', username: '@flortorres', email: 'flor@influencer.com', phone: '+54 9 11 5432-1098', instagram: '@flortorres', followers: 340000, category: 'Fashion Sports', tier: 1, uniLink: 'FLOR2024', referrals: { total: 201, converted: 167, conversionRate: 83.08 }, contractType: 'revenue_share', rate: 0, status: 'active', stats: { totalReach: 1200000, engagement: 5.7, codesUsed: 567, revenueGenerated: 2340000 }, createdAt: '2024-01-01T09:00:00Z' },
  { id: 'inf8', name: 'Agustín Méndez', username: '@agusactivo', email: 'agus@influencer.com', phone: '+54 9 261 333-7890', instagram: '@agusactivo', followers: 15000, category: 'Active Lifestyle', tier: 4, uniLink: 'AGUS2024', referrals: { total: 12, converted: 7, conversionRate: 58.33 }, contractType: 'campaign', rate: 2000, status: 'active', stats: { totalReach: 48000, engagement: 7.8, codesUsed: 23, revenueGenerated: 78000 }, createdAt: '2024-06-01T09:00:00Z' }
]

export const DEMO_BENEFITS = [
  { id: 'ben1', brandId: 'b1', locationIds: ['l1','l2','l3'], type: 'discount', title: '20% OFF en toda la tienda', description: 'Válido para compras mayores a $10,000', value: 20, minPurchase: 10000, validFrom: '2026-04-01', validUntil: '2026-04-30', usageLimit: 1000, usageCount: 423, status: 'active', terms: 'No acumulable con otras promociones', createdAt: '2026-03-15T10:00:00Z' },
  { id: 'ben2', brandId: 'b1', locationIds: ['l2'], type: '2x1', title: '2x1 en calzado seleccionado', description: 'Selección de modelos running', value: 0, minPurchase: 0, validFrom: '2026-04-15', validUntil: '2026-04-30', usageLimit: 200, usageCount: 89, status: 'active', terms: 'Modelo de menor precio es gratuito', createdAt: '2026-04-01T10:00:00Z' },
  { id: 'ben3', brandId: 'b1', locationIds: ['l1','l3'], type: 'freebie', title: 'Medias gratis con compra > $15,000', description: 'Par de medias deportivas Nike de regalo', value: 2500, minPurchase: 15000, validFrom: '2026-04-01', validUntil: '2026-05-31', usageLimit: 500, usageCount: 178, status: 'active', terms: 'Stock limitado', createdAt: '2026-03-20T10:00:00Z' },
  { id: 'ben4', brandId: 'b1', locationIds: ['l1','l2','l3'], type: 'points', title: '3x puntos en toda la tienda', description: 'Multiplica tus puntos en cada compra', value: 3, minPurchase: 0, validFrom: '2026-03-01', validUntil: '2026-06-30', usageLimit: 2000, usageCount: 1234, status: 'active', terms: 'Requiere membresía activa', createdAt: '2026-02-15T10:00:00Z' },
  { id: 'ben5', brandId: 'b2', locationIds: ['l4','l5'], type: 'discount', title: '15% OFF ropa deportiva', description: 'Aplicable en categoría ropa', value: 15, minPurchase: 8000, validFrom: '2026-04-01', validUntil: '2026-04-30', usageLimit: 800, usageCount: 312, status: 'active', terms: 'No válido en últimas colecciones', createdAt: '2026-03-25T10:00:00Z' },
  { id: 'ben6', brandId: 'b2', locationIds: ['l4'], type: 'freebie', title: 'Botella gratis con compra > $20,000', description: 'Botella deportiva Adidas 750ml', value: 3500, minPurchase: 20000, validFrom: '2026-04-10', validUntil: '2026-05-10', usageLimit: 300, usageCount: 145, status: 'active', terms: 'Una por transacción', createdAt: '2026-04-01T10:00:00Z' },
  { id: 'ben7', brandId: 'b2', locationIds: ['l5'], type: '2x1', title: '2x1 en remeras Adidas', description: 'Colección basic temporada', value: 0, minPurchase: 0, validFrom: '2026-03-01', validUntil: '2026-03-31', usageLimit: 150, usageCount: 150, status: 'expired', terms: 'Mismo modelo y talle', createdAt: '2026-02-20T10:00:00Z' },
  { id: 'ben8', brandId: 'b2', locationIds: ['l4','l5'], type: 'discount', title: '25% OFF calzado running', description: 'Línea Adidas Boost completa', value: 25, minPurchase: 15000, validFrom: '2026-05-01', validUntil: '2026-05-31', usageLimit: 600, usageCount: 0, status: 'paused', terms: 'Solo talles disponibles en stock', createdAt: '2026-04-10T10:00:00Z' },
  { id: 'ben9', brandId: 'b3', locationIds: ['l6','l7'], type: 'discount', title: '10% OFF primera compra', description: 'Bienvenida a Puma', value: 10, minPurchase: 5000, validFrom: '2026-01-01', validUntil: '2026-12-31', usageLimit: 999, usageCount: 234, status: 'active', terms: 'Solo primera compra del usuario', createdAt: '2026-01-01T10:00:00Z' },
  { id: 'ben10', brandId: 'b3', locationIds: ['l6'], type: 'points', title: '2x puntos en Puma Recoleta', description: 'Acumula más rápido', value: 2, minPurchase: 0, validFrom: '2026-04-01', validUntil: '2026-06-30', usageLimit: 500, usageCount: 98, status: 'active', terms: 'Requiere membresía', createdAt: '2026-03-25T10:00:00Z' },
  { id: 'ben11', brandId: 'b3', locationIds: ['l7'], type: 'freebie', title: 'Gorra gratis con compra > $25,000', description: 'Gorra Puma Performance', value: 4500, minPurchase: 25000, validFrom: '2026-04-01', validUntil: '2026-04-30', usageLimit: 100, usageCount: 67, status: 'active', terms: 'Un por compra', createdAt: '2026-03-28T10:00:00Z' },
  { id: 'ben12', brandId: 'b4', locationIds: ['l8','l9'], type: 'discount', title: '30% OFF liquidación', description: 'Colección anterior temporada', value: 30, minPurchase: 0, validFrom: '2026-03-15', validUntil: '2026-04-15', usageLimit: 400, usageCount: 389, status: 'active', terms: 'Solo modelos de temporada anterior', createdAt: '2026-03-10T10:00:00Z' },
  { id: 'ben13', brandId: 'b4', locationIds: ['l8'], type: '2x1', title: '2x1 en zapatillas fitness', description: 'CrossFit y training', value: 0, minPurchase: 0, validFrom: '2026-02-01', validUntil: '2026-02-28', usageLimit: 100, usageCount: 100, status: 'expired', terms: 'Stock disponible', createdAt: '2026-01-25T10:00:00Z' },
  { id: 'ben14', brandId: 'b5', locationIds: ['l10'], type: 'discount', title: '18% OFF alta tecnología', description: 'Línea UA HOVR y Storm', value: 18, minPurchase: 12000, validFrom: '2026-04-01', validUntil: '2026-04-30', usageLimit: 700, usageCount: 156, status: 'active', terms: 'Solo líneas premium', createdAt: '2026-03-20T10:00:00Z' },
  { id: 'ben15', brandId: 'b5', locationIds: ['l10'], type: 'points', title: '5x puntos Under Armour', description: 'Máxima acumulación de puntos', value: 5, minPurchase: 20000, validFrom: '2026-04-01', validUntil: '2026-06-30', usageLimit: 300, usageCount: 89, status: 'active', terms: 'Solo compras premium UA', createdAt: '2026-03-22T10:00:00Z' }
]

export const DEMO_CODES = [
  { id: 'cod1', code: 'MARIA20NIKE', benefitId: 'ben1', brandId: 'b1', locationId: 'l1', influencerId: 'inf1', type: 'multi_use', usageLimit: 50, usageCount: 34, status: 'active', validFrom: '2026-04-01', validUntil: '2026-04-30', createdAt: '2026-03-28T10:00:00Z' },
  { id: 'cod2', code: 'VALE20NIKE', benefitId: 'ben1', brandId: 'b1', locationId: 'l2', influencerId: 'inf3', type: 'multi_use', usageLimit: 100, usageCount: 67, status: 'active', validFrom: '2026-04-01', validUntil: '2026-04-30', createdAt: '2026-03-28T10:00:00Z' },
  { id: 'cod3', code: 'FLOR20NIKE', benefitId: 'ben1', brandId: 'b1', locationId: 'l3', influencerId: 'inf7', type: 'multi_use', usageLimit: 200, usageCount: 156, status: 'active', validFrom: '2026-04-01', validUntil: '2026-04-30', createdAt: '2026-03-28T10:00:00Z' },
  { id: 'cod4', code: 'CAMI20NIKE', benefitId: 'ben1', brandId: 'b1', locationId: 'l1', influencerId: 'inf5', type: 'multi_use', usageLimit: 75, usageCount: 75, status: 'depleted', validFrom: '2026-04-01', validUntil: '2026-04-30', createdAt: '2026-03-28T10:00:00Z' },
  { id: 'cod5', code: 'NIKE2X1MICRO', benefitId: 'ben2', brandId: 'b1', locationId: 'l2', influencerId: null, type: 'multi_use', usageLimit: 50, usageCount: 23, status: 'active', validFrom: '2026-04-15', validUntil: '2026-04-30', createdAt: '2026-04-10T10:00:00Z' },
  { id: 'cod6', code: 'NIKEFREEMARIA', benefitId: 'ben3', brandId: 'b1', locationId: 'l1', influencerId: 'inf1', type: 'multi_use', usageLimit: 30, usageCount: 18, status: 'active', validFrom: '2026-04-01', validUntil: '2026-05-31', createdAt: '2026-03-25T10:00:00Z' },
  { id: 'cod7', code: 'LUCAS15ADS', benefitId: 'ben5', brandId: 'b2', locationId: 'l4', influencerId: 'inf2', type: 'multi_use', usageLimit: 80, usageCount: 45, status: 'active', validFrom: '2026-04-01', validUntil: '2026-04-30', createdAt: '2026-03-30T10:00:00Z' },
  { id: 'cod8', code: 'FLORADIDAS15', benefitId: 'ben5', brandId: 'b2', locationId: 'l5', influencerId: 'inf7', type: 'multi_use', usageLimit: 120, usageCount: 89, status: 'active', validFrom: '2026-04-01', validUntil: '2026-04-30', createdAt: '2026-03-30T10:00:00Z' },
  { id: 'cod9', code: 'ADIFREEBOTTLE', benefitId: 'ben6', brandId: 'b2', locationId: 'l4', influencerId: null, type: 'multi_use', usageLimit: 40, usageCount: 31, status: 'active', validFrom: '2026-04-10', validUntil: '2026-05-10', createdAt: '2026-04-08T10:00:00Z' },
  { id: 'cod10', code: 'SEB15ADIDAS', benefitId: 'ben5', brandId: 'b2', locationId: 'l4', influencerId: 'inf6', type: 'multi_use', usageLimit: 30, usageCount: 12, status: 'active', validFrom: '2026-04-01', validUntil: '2026-04-30', createdAt: '2026-03-30T10:00:00Z' },
  { id: 'cod11', code: 'MATEOPUMA10', benefitId: 'ben9', brandId: 'b3', locationId: 'l6', influencerId: 'inf4', type: 'multi_use', usageLimit: 40, usageCount: 28, status: 'active', validFrom: '2026-01-01', validUntil: '2026-12-31', createdAt: '2026-01-15T10:00:00Z' },
  { id: 'cod12', code: 'CAMILAPUMA10', benefitId: 'ben9', brandId: 'b3', locationId: 'l7', influencerId: 'inf5', type: 'multi_use', usageLimit: 40, usageCount: 19, status: 'active', validFrom: '2026-01-01', validUntil: '2026-12-31', createdAt: '2026-01-15T10:00:00Z' },
  { id: 'cod13', code: 'PUMAPUNTOS2X', benefitId: 'ben10', brandId: 'b3', locationId: 'l6', influencerId: null, type: 'multi_use', usageLimit: 100, usageCount: 45, status: 'active', validFrom: '2026-04-01', validUntil: '2026-06-30', createdAt: '2026-03-28T10:00:00Z' },
  { id: 'cod14', code: 'REEBOOK30CBA', benefitId: 'ben12', brandId: 'b4', locationId: 'l8', influencerId: null, type: 'multi_use', usageLimit: 200, usageCount: 198, status: 'active', validFrom: '2026-03-15', validUntil: '2026-04-15', createdAt: '2026-03-12T10:00:00Z' },
  { id: 'cod15', code: 'REEBOOK30ROS', benefitId: 'ben12', brandId: 'b4', locationId: 'l9', influencerId: null, type: 'multi_use', usageLimit: 200, usageCount: 191, status: 'active', validFrom: '2026-03-15', validUntil: '2026-04-15', createdAt: '2026-03-12T10:00:00Z' },
  { id: 'cod16', code: 'MARIAUA18', benefitId: 'ben14', brandId: 'b5', locationId: 'l10', influencerId: 'inf1', type: 'multi_use', usageLimit: 60, usageCount: 42, status: 'active', validFrom: '2026-04-01', validUntil: '2026-04-30', createdAt: '2026-03-28T10:00:00Z' },
  { id: 'cod17', code: 'FLORUA18', benefitId: 'ben14', brandId: 'b5', locationId: 'l10', influencerId: 'inf7', type: 'multi_use', usageLimit: 100, usageCount: 78, status: 'active', validFrom: '2026-04-01', validUntil: '2026-04-30', createdAt: '2026-03-28T10:00:00Z' },
  { id: 'cod18', code: 'UAPUNTOS5X', benefitId: 'ben15', brandId: 'b5', locationId: 'l10', influencerId: null, type: 'multi_use', usageLimit: 50, usageCount: 34, status: 'active', validFrom: '2026-04-01', validUntil: '2026-06-30', createdAt: '2026-03-28T10:00:00Z' },
  { id: 'cod19', code: 'AGUS-A1B2C3', benefitId: 'ben9', brandId: 'b3', locationId: 'l7', influencerId: 'inf8', type: 'unique', usageLimit: 1, usageCount: 1, status: 'depleted', validFrom: '2026-03-01', validUntil: '2026-03-31', createdAt: '2026-02-28T10:00:00Z' },
  { id: 'cod20', code: 'AGUS-D4E5F6', benefitId: 'ben9', brandId: 'b3', locationId: 'l7', influencerId: 'inf8', type: 'unique', usageLimit: 1, usageCount: 0, status: 'active', validFrom: '2026-04-01', validUntil: '2026-04-30', createdAt: '2026-03-28T10:00:00Z' },
  { id: 'cod21', code: 'VALE-G7H8I9', benefitId: 'ben1', brandId: 'b1', locationId: 'l1', influencerId: 'inf3', type: 'unique', usageLimit: 1, usageCount: 0, status: 'active', validFrom: '2026-04-01', validUntil: '2026-04-30', createdAt: '2026-04-01T10:00:00Z' },
  { id: 'cod22', code: 'VALE-J1K2L3', benefitId: 'ben1', brandId: 'b1', locationId: 'l1', influencerId: 'inf3', type: 'unique', usageLimit: 1, usageCount: 0, status: 'active', validFrom: '2026-04-01', validUntil: '2026-04-30', createdAt: '2026-04-01T10:00:00Z' },
  { id: 'cod23', code: 'SEB-M4N5O6', benefitId: 'ben5', brandId: 'b2', locationId: 'l4', influencerId: 'inf6', type: 'unique', usageLimit: 1, usageCount: 0, status: 'active', validFrom: '2026-04-01', validUntil: '2026-04-30', createdAt: '2026-04-01T10:00:00Z' },
  { id: 'cod24', code: 'NIKEXP2026', benefitId: 'ben4', brandId: 'b1', locationId: null, influencerId: null, type: 'multi_use', usageLimit: 500, usageCount: 456, status: 'active', validFrom: '2026-03-01', validUntil: '2026-06-30', createdAt: '2026-02-28T10:00:00Z' },
  { id: 'cod25', code: 'UAELITE5X', benefitId: 'ben15', brandId: 'b5', locationId: 'l10', influencerId: null, type: 'multi_use', usageLimit: 100, usageCount: 55, status: 'active', validFrom: '2026-04-01', validUntil: '2026-06-30', createdAt: '2026-03-30T10:00:00Z' }
]

// 60 usages — 10 Jan, 12 Feb, 15 Mar, 23 Apr
const _RAW_USAGES = [
  ['cod11','b3','l6','inf4',15000,0.10,'2026-01-05',1],['cod12','b3','l7','inf5',22000,0.10,'2026-01-08',2],
  ['cod11','b3','l6','inf4',18000,0.10,'2026-01-11',3],['cod12','b3','l7','inf5',12000,0.10,'2026-01-14',4],
  ['cod11','b3','l6','inf4',25000,0.10,'2026-01-18',5],['cod12','b3','l7','inf5',17000,0.10,'2026-01-21',6],
  ['cod11','b3','l6','inf4',14000,0.10,'2026-01-24',7],['cod12','b3','l7','inf5',28000,0.10,'2026-01-27',8],
  ['cod11','b3','l6','inf4',19500,0.10,'2026-01-29',9],['cod12','b3','l7','inf5',21000,0.10,'2026-01-31',10],
  ['cod7','b2','l4','inf2',35000,0.15,'2026-02-03',11],['cod8','b2','l5','inf7',42000,0.15,'2026-02-05',12],
  ['cod7','b2','l4','inf2',28000,0.15,'2026-02-08',13],['cod8','b2','l5','inf7',55000,0.15,'2026-02-10',14],
  ['cod9','b2','l4',null,38000,0,'2026-02-12',15],['cod7','b2','l4','inf2',31000,0.15,'2026-02-14',16],
  ['cod8','b2','l5','inf7',47000,0.15,'2026-02-17',17],['cod9','b2','l4',null,22000,0,'2026-02-19',18],
  ['cod7','b2','l4','inf2',39000,0.15,'2026-02-21',19],['cod8','b2','l5','inf7',61000,0.15,'2026-02-23',20],
  ['cod9','b2','l4',null,28500,0,'2026-02-25',21],['cod7','b2','l4','inf2',44000,0.15,'2026-02-27',22],
  ['cod14','b4','l8',null,18000,0.30,'2026-03-16',23],['cod15','b4','l9',null,22000,0.30,'2026-03-17',24],
  ['cod1','b1','l1','inf1',45000,0.20,'2026-03-18',25],['cod2','b1','l2','inf3',38000,0.20,'2026-03-19',26],
  ['cod3','b1','l3','inf7',52000,0.20,'2026-03-20',27],['cod14','b4','l8',null,15000,0.30,'2026-03-21',28],
  ['cod15','b4','l9',null,19000,0.30,'2026-03-22',29],['cod1','b1','l1','inf1',41000,0.20,'2026-03-23',30],
  ['cod2','b1','l2','inf3',33000,0.20,'2026-03-24',31],['cod3','b1','l3','inf7',49000,0.20,'2026-03-25',32],
  ['cod14','b4','l8',null,21000,0.30,'2026-03-26',33],['cod24','b1',null,null,28000,0,'2026-03-27',34],
  ['cod16','b5','l10','inf1',65000,0.18,'2026-03-28',35],['cod17','b5','l10','inf7',78000,0.18,'2026-03-29',36],
  ['cod24','b1',null,null,35000,0,'2026-03-30',37],
  ['cod1','b1','l1','inf1',42000,0.20,'2026-04-01',38],['cod2','b1','l2','inf3',55000,0.20,'2026-04-02',39],
  ['cod3','b1','l3','inf7',48000,0.20,'2026-04-03',40],['cod7','b2','l4','inf2',39000,0.15,'2026-04-04',41],
  ['cod8','b2','l5','inf7',67000,0.15,'2026-04-05',42],['cod16','b5','l10','inf1',72000,0.18,'2026-04-06',43],
  ['cod17','b5','l10','inf7',91000,0.18,'2026-04-07',44],['cod5','b1','l2',null,32000,0,'2026-04-08',45],
  ['cod9','b2','l4',null,44000,0,'2026-04-09',46],['cod1','b1','l1','inf1',38000,0.20,'2026-04-10',47],
  ['cod2','b1','l2','inf3',51000,0.20,'2026-04-11',48],['cod3','b1','l3','inf7',59000,0.20,'2026-04-12',49],
  ['cod13','b3','l6',null,18000,0,'2026-04-13',50],['cod16','b5','l10','inf1',82000,0.18,'2026-04-14',51],
  ['cod17','b5','l10','inf7',75000,0.18,'2026-04-15',52],['cod7','b2','l4','inf2',46000,0.15,'2026-04-16',53],
  ['cod8','b2','l5','inf7',58000,0.15,'2026-04-17',54],['cod1','b1','l1','inf1',43000,0.20,'2026-04-18',55],
  ['cod24','b1',null,null,31000,0,'2026-04-19',56],['cod25','b5','l10',null,88000,0,'2026-04-20',57],
  ['cod17','b5','l10','inf7',95000,0.18,'2026-04-21',58],['cod3','b1','l3','inf7',64000,0.20,'2026-04-22',59],
  ['cod16','b5','l10','inf1',77000,0.18,'2026-04-23',60]
]

const _CITIES_U = ['Buenos Aires','Rosario','Córdoba','Mendoza','La Plata','Mar del Plata','Tucumán','Santa Fe']
const _GENDERS = ['F','M','F','F','M','F','M','F','F','M']

export const DEMO_CODE_USAGES = _RAW_USAGES.map(([codeId, brandId, locationId, influencerId, purchaseAmount, discRate, date, userIdx]) => {
  const discountAmount = Math.round(purchaseAmount * discRate)
  return {
    id: `use${userIdx}`, codeId, brandId, locationId, influencerId,
    userId: `usr${userIdx}`,
    purchaseAmount, discountAmount, finalAmount: purchaseAmount - discountAmount,
    timestamp: `${date}T${String(9 + (userIdx % 12)).padStart(2,'0')}:${String(userIdx % 60).padStart(2,'0')}:00`,
    userDemographics: {
      age: 22 + (userIdx % 22),
      gender: _GENDERS[userIdx % _GENDERS.length],
      city: _CITIES_U[userIdx % _CITIES_U.length],
      memberSince: `2026-0${Math.max(1,Math.min(4,Math.ceil(userIdx/20)))}-01`
    }
  }
})

const _NF = ['Ana','María','Valentina','Sofía','Camila','Lucía','Martina','Florencia','Julia','Paula','Laura','Sandra','Carla','Natalia','Verónica']
const _NM = ['Carlos','Juan','Mateo','Lucas','Nicolás','Agustín','Diego','Sebastián','Ramiro','Pablo','Fernando','Rodrigo','Andrés','Gabriel','Oscar']
const _SN = ['García','Martínez','López','González','Rodríguez','Fernández','Torres','Herrera','Sánchez','Romero','Medina','Vargas','Díaz','Reyes','Cruz','Flores','Gómez','Vega','Morales','Ruiz']
const _INF_REF = ['inf1','inf2','inf3','inf4','inf5','inf6','inf7','inf8',null,null,null,null]

export const DEMO_USERS = Array.from({ length: 60 }, (_, i) => {
  const isFemale = i % 3 !== 1
  const firstName = isFemale ? _NF[i % _NF.length] : _NM[i % _NM.length]
  const city = _CITIES_U[i % _CITIES_U.length]
  const mo = String(Math.max(1, Math.min(4, Math.ceil((i + 1) / 15)))).padStart(2, '0')
  return {
    id: `usr${i + 1}`,
    name: `${firstName} ${_SN[i % _SN.length]}`,
    email: `${firstName.toLowerCase()}${i + 1}@email.com`,
    phone: `+54 9 ${city === 'Rosario' ? '341' : city === 'Córdoba' ? '351' : '11'} ${String(40000000 + i * 1234567).slice(0, 8)}`,
    age: 22 + (i % 22),
    gender: isFemale ? 'F' : 'M',
    city,
    referredBy: _INF_REF[i % _INF_REF.length],
    memberSince: `2026-${mo}-${String((i % 28) + 1).padStart(2, '0')}`,
    totalPurchases: 2 + (i % 14),
    totalSpent: 15000 + (i * 2800) % 195000,
    codesUsed: [`cod${(i % 25) + 1}`, `cod${((i + 7) % 25) + 1}`].filter((v, j, a) => a.indexOf(v) === j)
  }
})

const _PAYMENT = ['credit_card','debit_card','mercadopago','transfer']
const _PLANS = ['monthly','monthly','monthly','annual']

export const DEMO_MEMBERSHIPS = Array.from({ length: 40 }, (_, i) => {
  const plan = _PLANS[i % _PLANS.length]
  const isActive = i < 34
  const mo = String(Math.max(1, Math.min(4, Math.ceil((i + 1) / 10)))).padStart(2, '0')
  const startDate = `2026-${mo}-01`
  return {
    id: `mem${i + 1}`,
    userId: `usr${(i % 60) + 1}`,
    plan,
    price: plan === 'annual' ? 20000 : 2000,
    status: isActive ? 'active' : (i === 35 ? 'cancelled' : 'expired'),
    startDate,
    endDate: plan === 'annual' ? '2027-01-01' : '2026-05-01',
    autoRenew: i % 5 !== 0,
    paymentMethod: _PAYMENT[i % _PAYMENT.length],
    referredBy: i % 3 === 0 ? `inf${(i % 8) + 1}` : null,
    createdAt: `${startDate}T09:00:00Z`
  }
})

// ═══════════════════════════════════════════════
// DEMO DATA - PHASE 3: AGENCIA CREATIVA
// ═══════════════════════════════════════════════

export const DEMO_CREATIVE_CLIENTS = [
  { id: 'cc1', name: 'Nike Argentina', contactPerson: 'Carlos Méndez', email: 'carlos@nike.com', phone: '+54 11 4000-1234', type: 'retainer', status: 'active', projectsCount: 3, totalRevenue: 320000, createdAt: '2024-01-15T09:00:00Z' },
  { id: 'cc2', name: 'Adidas Latam', contactPerson: 'Sofía Ruiz', email: 'sofia@adidas.com', phone: '+54 11 4000-5678', type: 'retainer', status: 'active', projectsCount: 2, totalRevenue: 185000, createdAt: '2024-02-01T09:00:00Z' },
  { id: 'cc3', name: 'Puma Argentina', contactPerson: 'Martín López', email: 'martin@puma.com', phone: '+54 11 4000-9012', type: 'one_time', status: 'active', projectsCount: 1, totalRevenue: 75000, createdAt: '2024-03-10T09:00:00Z' },
  { id: 'cc4', name: 'Under Armour AR', contactPerson: 'Diego Torres', email: 'diego@ua.com', phone: '+54 11 4000-7890', type: 'one_time', status: 'active', projectsCount: 1, totalRevenue: 48000, createdAt: '2024-04-01T09:00:00Z' },
  { id: 'cc5', name: 'New Balance Sur', contactPerson: 'Lucía Vargas', email: 'lucia@nb.com', phone: '+54 11 3000-1234', type: 'retainer', status: 'active', projectsCount: 1, totalRevenue: 95000, createdAt: '2024-03-20T09:00:00Z' },
]

export const DEMO_CREATIVE_PROJECTS = [
  { id: 'cp1', type: 'monthly_retainer', clientId: 'cc1', name: 'Nike Social Media Q2', description: 'Gestión mensual redes sociales Nike Argentina — Instagram, TikTok, Facebook', status: 'in_progress', budget: 80000, budgetSpent: 54000, startDate: '2026-04-01', endDate: '2026-06-30', team: ['Ana P.', 'Lucas M.', 'Valentina R.'], deliverables: [{ name: 'Estrategia Q2', status: 'completed', dueDate: '2026-04-10' }, { name: 'Content Calendar Abril', status: 'completed', dueDate: '2026-04-15' }, { name: 'Content Calendar Mayo', status: 'in_progress', dueDate: '2026-05-01' }, { name: 'Reporte Mensual', status: 'pending', dueDate: '2026-04-30' }], hoursTracked: 145, hoursEstimated: 240, createdAt: '2026-03-20T10:00:00Z' },
  { id: 'cp2', type: 'special', clientId: 'cc1', name: 'Nike Launch Campaign "Aire"', description: 'Campaña especial lanzamiento colección Aire — dirección de arte, producción contenidos, activaciones', status: 'in_progress', budget: 150000, budgetSpent: 89000, startDate: '2026-03-15', endDate: '2026-05-15', team: ['Florencia T.', 'Mateo S.', 'Ana P.'], deliverables: [{ name: 'Brief Creativo', status: 'completed', dueDate: '2026-03-20' }, { name: 'Producción Fotos', status: 'completed', dueDate: '2026-04-05' }, { name: 'Edición Videos', status: 'in_progress', dueDate: '2026-04-25' }, { name: 'Assets Digitales', status: 'pending', dueDate: '2026-05-01' }], hoursTracked: 210, hoursEstimated: 320, createdAt: '2026-03-10T10:00:00Z' },
  { id: 'cp3', type: 'consultancy', clientId: 'cc2', name: 'Estrategia Digital Adidas', description: 'Consultoría 1-on-1: auditoría presencia digital y plan estratégico 6 meses', status: 'completed', budget: 45000, budgetSpent: 45000, startDate: '2026-02-01', endDate: '2026-03-31', team: ['Valentina R.'], deliverables: [{ name: 'Auditoría Digital', status: 'completed', dueDate: '2026-02-15' }, { name: 'Plan Estratégico', status: 'completed', dueDate: '2026-03-15' }, { name: 'Presentación Final', status: 'completed', dueDate: '2026-03-31' }], hoursTracked: 80, hoursEstimated: 80, createdAt: '2026-01-25T10:00:00Z' },
  { id: 'cp4', type: 'monthly_retainer', clientId: 'cc2', name: 'Adidas Content Monthly', description: 'Producción mensual contenidos — 20 posts, 40 stories, 4 reels', status: 'in_progress', budget: 65000, budgetSpent: 32000, startDate: '2026-04-01', endDate: '2026-06-30', team: ['Lucas M.', 'Camila F.'], deliverables: [{ name: 'Sesión Fotos Abril', status: 'completed', dueDate: '2026-04-08' }, { name: 'Reels Abril', status: 'in_progress', dueDate: '2026-04-20' }, { name: 'Stories Pack', status: 'pending', dueDate: '2026-04-25' }], hoursTracked: 67, hoursEstimated: 200, createdAt: '2026-03-25T10:00:00Z' },
  { id: 'cp5', type: 'defined', clientId: 'cc3', name: 'Puma Brand Identity Refresh', description: 'Renovación identidad visual Puma Argentina — logo, colores, tipografías, brandbook', status: 'proposal', budget: 75000, budgetSpent: 0, startDate: '2026-05-01', endDate: '2026-07-01', team: ['Florencia T.', 'Mateo S.'], deliverables: [{ name: 'Research & Moodboard', status: 'pending', dueDate: '2026-05-15' }, { name: 'Propuestas Visuales', status: 'pending', dueDate: '2026-06-01' }, { name: 'Brandbook Final', status: 'pending', dueDate: '2026-06-30' }], hoursTracked: 0, hoursEstimated: 180, createdAt: '2026-04-10T10:00:00Z' },
  { id: 'cp6', type: 'defined', clientId: 'cc4', name: 'UA Website Redesign', description: 'Rediseño completo sitio web Under Armour Argentina — UX/UI, desarrollo frontend', status: 'in_progress', budget: 48000, budgetSpent: 21000, startDate: '2026-03-01', endDate: '2026-05-30', team: ['Lucas M.', 'Ana P.', 'Valentina R.'], deliverables: [{ name: 'Wireframes', status: 'completed', dueDate: '2026-03-15' }, { name: 'Diseño UI', status: 'in_progress', dueDate: '2026-04-15' }, { name: 'Desarrollo', status: 'pending', dueDate: '2026-05-15' }], hoursTracked: 98, hoursEstimated: 220, createdAt: '2026-02-20T10:00:00Z' },
  { id: 'cp7', type: 'monthly_retainer', clientId: 'cc5', name: 'New Balance Content', description: 'Gestión contenidos New Balance — foco en running y estilo de vida', status: 'in_progress', budget: 55000, budgetSpent: 18000, startDate: '2026-04-01', endDate: '2026-06-30', team: ['Camila F.', 'Mateo S.'], deliverables: [{ name: 'Calendario Abril', status: 'completed', dueDate: '2026-04-05' }, { name: 'Shooting Abril', status: 'in_progress', dueDate: '2026-04-18' }], hoursTracked: 55, hoursEstimated: 180, createdAt: '2026-03-28T10:00:00Z' },
  { id: 'cp8', type: 'special', clientId: 'cc1', name: 'Nike x Resilio Activación', description: 'Activación evento especial Nike — concepto, producción, experiencia de marca', status: 'completed', budget: 90000, budgetSpent: 87500, startDate: '2026-02-01', endDate: '2026-03-31', team: ['Florencia T.', 'Lucas M.', 'Ana P.', 'Mateo S.'], deliverables: [{ name: 'Concepto Creativo', status: 'completed', dueDate: '2026-02-10' }, { name: 'Producción', status: 'completed', dueDate: '2026-03-15' }, { name: 'Post-evento', status: 'completed', dueDate: '2026-03-31' }], hoursTracked: 280, hoursEstimated: 280, createdAt: '2026-01-20T10:00:00Z' },
]

// ═══════════════════════════════════════════════
// DEMO DATA - PHASE 3: AGENCIA INFLUENCERS
// ═══════════════════════════════════════════════

export const DEMO_INF_CAMPAIGNS = [
  { id: 'ic1', brandId: 'b1', brandName: 'Nike', name: 'Nike Spring Run 2026', description: 'Campaña de primavera foco running — product placement y reviews colección Pegasus', budget: 180000, status: 'active', startDate: '2026-04-01', endDate: '2026-04-30', influencersAssigned: ['inf1','inf3','inf7'], deliverables: [{ type: 'instagram_post', quantity: 6, completed: 4 }, { type: 'instagram_story', quantity: 12, completed: 12 }, { type: 'tiktok_video', quantity: 3, completed: 1 }], totalReach: 675000, totalEngagement: 33750, createdAt: '2026-03-15T10:00:00Z' },
  { id: 'ic2', brandId: 'b2', brandName: 'Adidas', name: 'Adidas Boost Experience', description: 'Lanzamiento zapatillas Adidas Boost — unboxing, try-on y contenido lifestyle', budget: 120000, status: 'active', startDate: '2026-04-10', endDate: '2026-05-10', influencersAssigned: ['inf2','inf5'], deliverables: [{ type: 'instagram_post', quantity: 4, completed: 2 }, { type: 'instagram_story', quantity: 8, completed: 5 }, { type: 'youtube_video', quantity: 2, completed: 0 }], totalReach: 167000, totalEngagement: 8680, createdAt: '2026-04-01T10:00:00Z' },
  { id: 'ic3', brandId: 'b5', brandName: 'Under Armour', name: 'UA Training Week', description: 'Semana de training UA — rutinas, equipamiento y challenge en redes', budget: 95000, status: 'active', startDate: '2026-04-07', endDate: '2026-04-21', influencersAssigned: ['inf1','inf2','inf6'], deliverables: [{ type: 'instagram_post', quantity: 3, completed: 3 }, { type: 'instagram_story', quantity: 10, completed: 10 }, { type: 'tiktok_video', quantity: 4, completed: 4 }], totalReach: 246000, totalEngagement: 14760, createdAt: '2026-04-01T10:00:00Z' },
  { id: 'ic4', brandId: 'b3', brandName: 'Puma', name: 'Puma Street Style', description: 'Campaña lifestyle urbano Puma — estilo de vida activo en ciudad', budget: 65000, status: 'completed', startDate: '2026-03-01', endDate: '2026-03-31', influencersAssigned: ['inf4','inf8'], deliverables: [{ type: 'instagram_post', quantity: 4, completed: 4 }, { type: 'instagram_story', quantity: 6, completed: 6 }, { type: 'tiktok_video', quantity: 2, completed: 2 }], totalReach: 63000, totalEngagement: 3969, createdAt: '2026-02-20T10:00:00Z' },
  { id: 'ic5', brandId: 'b1', brandName: 'Nike', name: 'Nike Women Collection', description: 'Colección femenina Nike — mujeres en deporte, inclusión y rendimiento', budget: 220000, status: 'planning', startDate: '2026-05-01', endDate: '2026-05-31', influencersAssigned: ['inf1','inf3','inf5','inf7'], deliverables: [{ type: 'instagram_post', quantity: 8, completed: 0 }, { type: 'instagram_story', quantity: 16, completed: 0 }, { type: 'tiktok_video', quantity: 4, completed: 0 }, { type: 'youtube_video', quantity: 2, completed: 0 }], totalReach: 0, totalEngagement: 0, createdAt: '2026-04-12T10:00:00Z' },
  { id: 'ic6', brandId: 'b2', brandName: 'Adidas', name: 'Adidas x Argentina Fútbol', description: 'Activación fútbol Adidas — previo a liga argentina, contenido pasión futbolera', budget: 150000, status: 'planning', startDate: '2026-05-15', endDate: '2026-06-15', influencersAssigned: ['inf2','inf3','inf7'], deliverables: [{ type: 'instagram_post', quantity: 6, completed: 0 }, { type: 'instagram_story', quantity: 10, completed: 0 }, { type: 'tiktok_video', quantity: 5, completed: 0 }], totalReach: 0, totalEngagement: 0, createdAt: '2026-04-15T10:00:00Z' },
]

export const DEMO_COLLABORATIONS = [
  { id: 'col1', campaignId: 'ic1', influencerId: 'inf1', brandId: 'b1', deliverable: 'instagram_post', quantity: 2, rate: 45000, status: 'completed', dueDate: '2026-04-10', completedDate: '2026-04-09', reach: 125000, engagement: 5625, link: 'https://instagram.com/p/demo1', createdAt: '2026-04-01T09:00:00Z' },
  { id: 'col2', campaignId: 'ic1', influencerId: 'inf1', brandId: 'b1', deliverable: 'instagram_story', quantity: 4, rate: 12000, status: 'completed', dueDate: '2026-04-15', completedDate: '2026-04-14', reach: 118000, engagement: 2360, link: 'https://instagram.com/stories/demo', createdAt: '2026-04-01T09:00:00Z' },
  { id: 'col3', campaignId: 'ic1', influencerId: 'inf3', brandId: 'b1', deliverable: 'instagram_post', quantity: 2, rate: 65000, status: 'in_progress', dueDate: '2026-04-22', completedDate: null, reach: 0, engagement: 0, link: null, createdAt: '2026-04-01T09:00:00Z' },
  { id: 'col4', campaignId: 'ic1', influencerId: 'inf7', brandId: 'b1', deliverable: 'tiktok_video', quantity: 1, rate: 55000, status: 'in_progress', dueDate: '2026-04-25', completedDate: null, reach: 0, engagement: 0, link: null, createdAt: '2026-04-01T09:00:00Z' },
  { id: 'col5', campaignId: 'ic2', influencerId: 'inf2', brandId: 'b2', deliverable: 'instagram_post', quantity: 2, rate: 18000, status: 'completed', dueDate: '2026-04-18', completedDate: '2026-04-17', reach: 89000, engagement: 4628, link: 'https://instagram.com/p/demo5', createdAt: '2026-04-10T09:00:00Z' },
  { id: 'col6', campaignId: 'ic2', influencerId: 'inf5', brandId: 'b2', deliverable: 'instagram_story', quantity: 5, rate: 14000, status: 'in_progress', dueDate: '2026-04-28', completedDate: null, reach: 0, engagement: 0, link: null, createdAt: '2026-04-10T09:00:00Z' },
  { id: 'col7', campaignId: 'ic3', influencerId: 'inf1', brandId: 'b5', deliverable: 'instagram_post', quantity: 1, rate: 30000, status: 'completed', dueDate: '2026-04-12', completedDate: '2026-04-11', reach: 125000, engagement: 5625, link: 'https://instagram.com/p/demo7', createdAt: '2026-04-07T09:00:00Z' },
  { id: 'col8', campaignId: 'ic3', influencerId: 'inf2', brandId: 'b5', deliverable: 'instagram_story', quantity: 4, rate: 9000, status: 'completed', dueDate: '2026-04-14', completedDate: '2026-04-14', reach: 89000, engagement: 1780, link: null, createdAt: '2026-04-07T09:00:00Z' },
  { id: 'col9', campaignId: 'ic3', influencerId: 'inf6', brandId: 'b5', deliverable: 'tiktok_video', quantity: 2, rate: 11000, status: 'completed', dueDate: '2026-04-18', completedDate: '2026-04-17', reach: 32000, engagement: 1984, link: 'https://tiktok.com/@seb/demo', createdAt: '2026-04-07T09:00:00Z' },
  { id: 'col10', campaignId: 'ic4', influencerId: 'inf4', brandId: 'b3', deliverable: 'instagram_post', quantity: 2, rate: 8000, status: 'completed', dueDate: '2026-03-20', completedDate: '2026-03-19', reach: 45000, engagement: 2745, link: 'https://instagram.com/p/demo10', createdAt: '2026-03-01T09:00:00Z' },
  { id: 'col11', campaignId: 'ic4', influencerId: 'inf4', brandId: 'b3', deliverable: 'tiktok_video', quantity: 1, rate: 5000, status: 'completed', dueDate: '2026-03-25', completedDate: '2026-03-24', reach: 45000, engagement: 2790, link: 'https://tiktok.com/@mateo/demo', createdAt: '2026-03-01T09:00:00Z' },
  { id: 'col12', campaignId: 'ic4', influencerId: 'inf8', brandId: 'b3', deliverable: 'instagram_post', quantity: 2, rate: 2000, status: 'completed', dueDate: '2026-03-28', completedDate: '2026-03-27', reach: 15000, engagement: 1170, link: 'https://instagram.com/p/demo12', createdAt: '2026-03-01T09:00:00Z' },
]

// ═══════════════════════════════════════════════
// DEMO DATA - PHASE 3: PRODUCTORA EVENTOS
// ═══════════════════════════════════════════════

export const DEMO_EVENTS = [
  { id: 'ev1', type: 'massive', name: 'Nike Air Max Day Rosario', description: 'Celebración Air Max Day con activaciones, música en vivo y lanzamiento exclusivo colección', venue: 'Galpón 11', address: 'Av. Belgrano 1234', city: 'Rosario', date: '2026-05-15', timeStart: '19:00', timeEnd: '02:00', capacity: 2000, ticketsSold: 1680, status: 'upcoming', budget: 480000, budgetSpent: 210000, sponsors: ['sp1','sp2','sp3'], staff: ['Jefe Producción: Laura V.', 'Logística: Rodrigo M.', 'RRPP: Camila F.'], createdAt: '2026-03-01T10:00:00Z' },
  { id: 'ev2', type: 'massive', name: 'Adidas Run Club CABA', description: 'Evento masivo running — carrera 5K, 10K y zona de experiencias Adidas', venue: 'Parque Centenario', address: 'Av. Díaz Vélez 4900', city: 'Buenos Aires', date: '2026-06-07', timeStart: '07:00', timeEnd: '14:00', capacity: 3500, ticketsSold: 2890, status: 'upcoming', budget: 650000, budgetSpent: 280000, sponsors: ['sp4','sp5'], staff: ['Producción: Mateo S.', 'Logística: Ana P.', 'Comunicaciones: Florencia T.'], createdAt: '2026-03-15T10:00:00Z' },
  { id: 'ev3', type: 'vip', name: 'Resilio Members Night — Abril', description: 'Noche exclusiva para miembros Resilio — degustación, networking y beneficios VIP', venue: 'Rooftop Alvear', address: 'Av. Alvear 1891, Piso 15', city: 'Buenos Aires', date: '2026-04-25', timeStart: '20:00', timeEnd: '00:00', capacity: 80, ticketsSold: 72, status: 'upcoming', budget: 95000, budgetSpent: 68000, sponsors: ['sp6'], staff: ['Host: Valentina R.', 'Producción: Lucas M.'], createdAt: '2026-04-01T10:00:00Z' },
  { id: 'ev4', type: 'vip', name: 'Under Armour Elite Training Camp', description: 'Training camp VIP UA — dos días de entrenamiento profesional con atletas UA', venue: 'Centro Deportivo Palermo', address: 'Av. del Libertador 7500', city: 'Buenos Aires', date: '2026-05-03', timeStart: '08:00', timeEnd: '18:00', capacity: 50, ticketsSold: 50, status: 'upcoming', budget: 120000, budgetSpent: 45000, sponsors: ['sp1','sp7'], staff: ['Director: Diego T.', 'Entrenamiento: Carlos M.'], createdAt: '2026-04-05T10:00:00Z' },
  { id: 'ev5', type: 'vip', name: 'Resilio Members Night — Marzo', description: 'Noche exclusiva miembros — edición previa, gran éxito de asistencia', venue: 'Bar El Federal', address: 'Carlos Calvo 599', city: 'Buenos Aires', date: '2026-03-28', timeStart: '20:00', timeEnd: '23:30', capacity: 60, ticketsSold: 60, status: 'completed', budget: 75000, budgetSpent: 71500, sponsors: ['sp8'], staff: ['Host: Valentina R.'], createdAt: '2026-03-01T10:00:00Z' },
]

export const DEMO_SPONSORS = [
  { id: 'sp1', eventId: 'ev1', name: 'Nike Argentina', tier: 'platinum', contribution: 120000, benefits: ['Logo principal escenario', 'Stand exclusivo 9m²', '5 menciones MC', 'Branding todas las piezas'], status: 'confirmed', createdAt: '2026-03-05T09:00:00Z' },
  { id: 'sp2', eventId: 'ev1', name: 'Coca-Cola Argentina', tier: 'gold', contribution: 60000, benefits: ['Logo escenario lateral', 'Hidratación oficial evento', '3 menciones MC'], status: 'confirmed', createdAt: '2026-03-10T09:00:00Z' },
  { id: 'sp3', eventId: 'ev1', name: 'Spotify', tier: 'silver', contribution: 30000, benefits: ['Logo piezas digitales', 'Playlist oficial evento', '1 mención MC'], status: 'confirmed', createdAt: '2026-03-15T09:00:00Z' },
  { id: 'sp4', eventId: 'ev2', name: 'Adidas Argentina', tier: 'platinum', contribution: 200000, benefits: ['Naming rights evento', 'Stand exclusivo 16m²', 'Medallas y premios branded', '8 menciones'], status: 'confirmed', createdAt: '2026-03-20T09:00:00Z' },
  { id: 'sp5', eventId: 'ev2', name: 'Gatorade', tier: 'gold', contribution: 80000, benefits: ['Hidratación oficial', 'Stand recuperación', '4 menciones', 'Branding banderas'], status: 'confirmed', createdAt: '2026-03-25T09:00:00Z' },
  { id: 'sp6', eventId: 'ev3', name: 'Moët & Chandon', tier: 'gold', contribution: 25000, benefits: ['Bebidas oficiales', 'Logo invitaciones', 'Mención apertura'], status: 'confirmed', createdAt: '2026-04-03T09:00:00Z' },
  { id: 'sp7', eventId: 'ev4', name: 'Under Armour', tier: 'platinum', contribution: 60000, benefits: ['Naming event', 'Indumentaria atletas y staff', 'Stand productos', 'Contenidos exclusivos'], status: 'confirmed', createdAt: '2026-04-06T09:00:00Z' },
  { id: 'sp8', eventId: 'ev5', name: 'Aperol', tier: 'gold', contribution: 18000, benefits: ['Bebida oficial', 'Cobranding piezas', 'Menciones'], status: 'confirmed', createdAt: '2026-03-02T09:00:00Z' },
]

export const DEMO_TICKETS = [
  { id: 'tk1', eventId: 'ev1', type: 'early_bird', price: 3500, quantity: 300, sold: 300, status: 'sold_out', createdAt: '2026-03-01T08:00:00Z' },
  { id: 'tk2', eventId: 'ev1', type: 'general', price: 5000, quantity: 1200, sold: 1100, status: 'available', createdAt: '2026-03-01T08:00:00Z' },
  { id: 'tk3', eventId: 'ev1', type: 'vip', price: 12000, quantity: 500, sold: 280, status: 'available', createdAt: '2026-03-01T08:00:00Z' },
  { id: 'tk4', eventId: 'ev2', type: 'early_bird', price: 2500, quantity: 500, sold: 500, status: 'sold_out', createdAt: '2026-03-15T08:00:00Z' },
  { id: 'tk5', eventId: 'ev2', type: 'general', price: 4000, quantity: 2000, sold: 1890, status: 'available', createdAt: '2026-03-15T08:00:00Z' },
  { id: 'tk6', eventId: 'ev2', type: 'vip', price: 9500, quantity: 1000, sold: 500, status: 'available', createdAt: '2026-03-15T08:00:00Z' },
  { id: 'tk7', eventId: 'ev3', type: 'general', price: 0, quantity: 80, sold: 72, status: 'available', createdAt: '2026-04-01T08:00:00Z' },
  { id: 'tk8', eventId: 'ev4', type: 'vip', price: 15000, quantity: 50, sold: 50, status: 'sold_out', createdAt: '2026-04-05T08:00:00Z' },
  { id: 'tk9', eventId: 'ev5', type: 'general', price: 0, quantity: 60, sold: 60, status: 'sold_out', createdAt: '2026-03-01T08:00:00Z' },
]

// ═══════════════════════════════════════════════
// DEMO DATA - PHASE 4
// ═══════════════════════════════════════════════

export const DEMO_ELEVARE_ASSETS = [
  // Real Estate (3)
  { id: 'ea1', unit: 'real_estate', name: 'Penthouse Puerto Madero', description: 'PH de lujo con vista al río y terraza privada. 3 suites, living doble altura, amenities premium.', price: 850000, currency: 'USD', status: 'available', location: 'Puerto Madero, CABA', contactPerson: 'Rodrigo Vidal', bedrooms: 3, bathrooms: 3, sqm: 280, createdAt: '2026-01-10T09:00:00Z' },
  { id: 'ea2', unit: 'real_estate', name: 'Casa Nordelta Golf', description: 'Residencia exclusiva frente al lago, 5 ambientes, pileta infinity, parque 1200m².', price: 620000, currency: 'USD', status: 'reserved', location: 'Nordelta, Tigre', contactPerson: 'Camila Esteve', bedrooms: 4, bathrooms: 4, sqm: 420, createdAt: '2026-01-18T09:00:00Z' },
  { id: 'ea3', unit: 'real_estate', name: 'PH Palermo Soho', description: 'Piso alto con terraza propia y solarium, cocina abierta, materiales de primer nivel.', price: 3800000, currency: 'ARS', status: 'available', location: 'Palermo Soho, CABA', contactPerson: 'Facundo Ríos', bedrooms: 2, bathrooms: 2, sqm: 140, createdAt: '2026-02-05T09:00:00Z' },
  // Development (3)
  { id: 'ed1', unit: 'development', name: 'Torre Elevare I', description: 'Desarrollo residencial de 18 pisos, 72 unidades, amenities club house, entrega Q3 2027.', price: 4500000, currency: 'USD', status: 'active', location: 'Palermo, CABA', contactPerson: 'Tomás Aguirre', bedrooms: 0, bathrooms: 0, sqm: 12500, createdAt: '2025-11-01T09:00:00Z' },
  { id: 'ed2', unit: 'development', name: 'Residencial Tigre Sur', description: 'Complejo de casas y dptos en barrio cerrado, 45 unidades, parque y amenities, entrega Q4 2026.', price: 2800000, currency: 'USD', status: 'active', location: 'Tigre, Buenos Aires', contactPerson: 'Valeria Méndez', bedrooms: 0, bathrooms: 0, sqm: 8200, createdAt: '2025-12-15T09:00:00Z' },
  { id: 'ed3', unit: 'development', name: 'Complejo Pilar Business', description: 'Parque empresarial con 12 locales y 8 oficinas, estacionamiento, seguridad 24hs.', price: 1900000, currency: 'USD', status: 'available', location: 'Pilar, Buenos Aires', contactPerson: 'Sebastián Caro', bedrooms: 0, bathrooms: 0, sqm: 4800, createdAt: '2026-02-20T09:00:00Z' },
  // Media (3)
  { id: 'em1', unit: 'media', name: 'Estudio Podcast Elevare', description: 'Estudio de grabación profesional con cabina aislada, equipamiento Shure y Focusrite de última generación.', price: 12000, currency: 'USD', status: 'active', location: 'Microcentro, CABA', contactPerson: 'Ana Belén Sosa', bedrooms: 0, bathrooms: 0, sqm: 0, createdAt: '2026-01-05T09:00:00Z' },
  { id: 'em2', unit: 'media', name: 'Canal YouTube Premium', description: 'Canal con 84K suscriptores activos, monetización activa, nicho lifestyle y real estate de lujo.', price: 35000, currency: 'USD', status: 'active', location: 'Digital', contactPerson: 'Lucas Ferreira', bedrooms: 0, bathrooms: 0, sqm: 0, createdAt: '2025-09-01T09:00:00Z' },
  { id: 'em3', unit: 'media', name: 'Newsletter Elevare Select', description: 'Lista curada de 12.400 suscriptores de alto poder adquisitivo, open rate 38%, semanal.', price: 18000, currency: 'USD', status: 'active', location: 'Digital', contactPerson: 'Florencia Ibáñez', bedrooms: 0, bathrooms: 0, sqm: 0, createdAt: '2025-10-15T09:00:00Z' },
  // B2B (3)
  { id: 'eb1', unit: 'b2b', name: 'Alianza Corporativa BBVA', description: 'Acuerdo exclusivo de beneficios financieros y línea de crédito preferencial para clientes Elevare.', price: 0, currency: 'USD', status: 'active', location: 'Buenos Aires', contactPerson: 'Hernán Quiroga', bedrooms: 0, bathrooms: 0, sqm: 0, createdAt: '2025-08-01T09:00:00Z' },
  { id: 'eb2', unit: 'b2b', name: 'Partnership Microsoft 365', description: 'Licencias corporativas y soporte premium para toda la operación del grupo Elevare / Resilio.', price: 8500, currency: 'USD', status: 'active', location: 'Buenos Aires', contactPerson: 'Mariana Pons', bedrooms: 0, bathrooms: 0, sqm: 0, createdAt: '2026-01-01T09:00:00Z' },
  { id: 'eb3', unit: 'b2b', name: 'Acuerdo Santander Select', description: 'Programa de loyalty co-branded con beneficios exclusivos para portafolio inmobiliario.', price: 0, currency: 'USD', status: 'reserved', location: 'Buenos Aires', contactPerson: 'Ignacio Leiva', bedrooms: 0, bathrooms: 0, sqm: 0, createdAt: '2026-03-10T09:00:00Z' },
  // Events (3)
  { id: 'ee1', unit: 'events', name: 'Salón Elevare CABA', description: 'Espacio exclusivo para eventos corporativos y sociales de alto perfil, capacidad 200 personas.', price: 0, currency: 'USD', status: 'active', location: 'Recoleta, CABA', contactPerson: 'Daniela Voss', bedrooms: 0, bathrooms: 0, sqm: 0, createdAt: '2025-07-01T09:00:00Z' },
  { id: 'ee2', unit: 'events', name: 'Villa Morra Venue', description: 'Venue premium en Asunción, Paraguay — conexión con mercado inmobiliario regional de lujo.', price: 0, currency: 'USD', status: 'active', location: 'Asunción, Paraguay', contactPerson: 'Alberto Ortiz', bedrooms: 0, bathrooms: 0, sqm: 0, createdAt: '2026-02-01T09:00:00Z' },
  { id: 'ee3', unit: 'events', name: 'Rooftop Belgrano Sky', description: 'Terraza privada con vista 360° de la ciudad, ideal para lanzamientos, networking y cenas íntimas.', price: 0, currency: 'USD', status: 'available', location: 'Belgrano, CABA', contactPerson: 'Renata Salazar', bedrooms: 0, bathrooms: 0, sqm: 0, createdAt: '2026-03-15T09:00:00Z' },
]

export const DEMO_ELEVARE_LEADS = [
  { id: 'el1',  assetId: 'ea1', unit: 'real_estate', name: 'Martín Álvarez',     email: 'malvarez@businessmail.com',  phone: '+54 9 11 5555-0101', interest: 'high',   status: 'proposal',  source: 'Referido',    notes: 'Interesado en cerrar antes de mayo. Comprador cash.', contactDate: '2026-04-10', createdAt: '2026-04-10T10:00:00Z' },
  { id: 'el2',  assetId: 'ea2', unit: 'real_estate', name: 'Carolina Funes',     email: 'cfunes@funes.ar',            phone: '+54 9 11 5555-0202', interest: 'high',   status: 'qualified', source: 'Web',         notes: 'Familia con 2 hijos, busca barrio cerrado.', contactDate: '2026-04-12', createdAt: '2026-04-12T10:00:00Z' },
  { id: 'el3',  assetId: 'ea3', unit: 'real_estate', name: 'Nicolás Peralta',    email: 'nperalta@gmail.com',         phone: '+54 9 11 5555-0303', interest: 'medium', status: 'contacted', source: 'Instagram',   notes: 'Inversor, busca renta.', contactDate: '2026-04-14', createdAt: '2026-04-14T10:00:00Z' },
  { id: 'el4',  assetId: 'ed1', unit: 'development', name: 'Grupo Inversor Sur', email: 'info@grupoinvsur.com',       phone: '+54 9 11 5555-0404', interest: 'high',   status: 'proposal',  source: 'Evento',      notes: 'Fondo buscando invertir USD 200K mínimo.', contactDate: '2026-04-08', createdAt: '2026-04-08T10:00:00Z' },
  { id: 'el5',  assetId: 'ed2', unit: 'development', name: 'Patricia Sánchez',   email: 'patricia.s@consulting.ar',   phone: '+54 9 11 5555-0505', interest: 'medium', status: 'new',       source: 'LinkedIn',    notes: 'Consultora buscando activo para portfolio.', contactDate: '2026-04-20', createdAt: '2026-04-20T10:00:00Z' },
  { id: 'el6',  assetId: 'ed3', unit: 'development', name: 'Roberto Escobar',    email: 'roberto@pilar-emp.com',      phone: '+54 9 11 5555-0606', interest: 'high',   status: 'qualified', source: 'Referido',    notes: 'Empresa de logística busca planta en Pilar.', contactDate: '2026-04-11', createdAt: '2026-04-11T10:00:00Z' },
  { id: 'el7',  assetId: 'em1', unit: 'media',       name: 'Diego Fernández',    email: 'diegof@mediagroup.ar',       phone: '+54 9 11 5555-0707', interest: 'medium', status: 'contacted', source: 'Web',         notes: 'Productora interesada en alquilar estudio.', contactDate: '2026-04-15', createdAt: '2026-04-15T10:00:00Z' },
  { id: 'el8',  assetId: 'em2', unit: 'media',       name: 'Agencia Bloom',      email: 'hola@agenciabloom.com',      phone: '+54 9 11 5555-0808', interest: 'high',   status: 'proposal',  source: 'Evento',      notes: 'Quieren comprar el canal para cliente de USA.', contactDate: '2026-04-09', createdAt: '2026-04-09T10:00:00Z' },
  { id: 'el9',  assetId: 'em3', unit: 'media',       name: 'Fernando Llorente',  email: 'fllorente@luxbrands.com',    phone: '+54 9 11 5555-0909', interest: 'medium', status: 'new',       source: 'Referido',    notes: 'Marca de lujo quiere patrocinar el newsletter.', contactDate: '2026-04-21', createdAt: '2026-04-21T10:00:00Z' },
  { id: 'el10', assetId: 'eb1', unit: 'b2b',         name: 'Claudia Romero',     email: 'cromero@creditosur.ar',      phone: '+54 9 11 5555-1010', interest: 'low',    status: 'new',       source: 'LinkedIn',    notes: 'Financiera quiere explorar alianza.', contactDate: '2026-04-22', createdAt: '2026-04-22T10:00:00Z' },
  { id: 'el11', assetId: 'eb2', unit: 'b2b',         name: 'Hernán Gutiérrez',   email: 'hgutierrez@techcorp.ar',     phone: '+54 9 11 5555-1111', interest: 'high',   status: 'qualified', source: 'Web',         notes: 'Empresa de 50 empleados buscando upgrade tech.', contactDate: '2026-04-13', createdAt: '2026-04-13T10:00:00Z' },
  { id: 'el12', assetId: 'eb3', unit: 'b2b',         name: 'Sofia Montoya',      email: 'smontoya@grupo-m.com',       phone: '+54 9 11 5555-1212', interest: 'medium', status: 'contacted', source: 'Instagram',   notes: 'Holding familiar interesado en beneficios Santander.', contactDate: '2026-04-16', createdAt: '2026-04-16T10:00:00Z' },
  { id: 'el13', assetId: 'ee1', unit: 'events',      name: 'Bodas.ar Agency',    email: 'eventos@bodas.ar',           phone: '+54 9 11 5555-1313', interest: 'high',   status: 'proposal',  source: 'Referido',    notes: 'Organizadora busca venue para bodas de lujo.', contactDate: '2026-04-07', createdAt: '2026-04-07T10:00:00Z' },
  { id: 'el14', assetId: 'ee2', unit: 'events',      name: 'GrupoMagna Paraguay', email: 'info@grupomagna.py',        phone: '+595 21 555-1414', interest: 'high',   status: 'closed',    source: 'Evento',      notes: 'Cerrado — evento corporativo 200 personas, julio.', contactDate: '2026-03-28', createdAt: '2026-03-28T10:00:00Z' },
  { id: 'el15', assetId: 'ee3', unit: 'events',      name: 'StartupBA',          email: 'eventos@startupba.com',      phone: '+54 9 11 5555-1515', interest: 'medium', status: 'contacted', source: 'Instagram',   notes: 'Demo day 80 pax, presupuesto ajustado.', contactDate: '2026-04-18', createdAt: '2026-04-18T10:00:00Z' },
  { id: 'el16', assetId: 'ea1', unit: 'real_estate', name: 'Andrés Villanueva',  email: 'avillanueva@hedge.com',      phone: '+54 9 11 5555-1616', interest: 'high',   status: 'proposal',  source: 'LinkedIn',    notes: 'Family office, liquidez inmediata.', contactDate: '2026-04-05', createdAt: '2026-04-05T10:00:00Z' },
  { id: 'el17', assetId: 'ed1', unit: 'development', name: 'Torre Inversión SA', email: 'legal@torreinversion.ar',   phone: '+54 9 11 5555-1717', interest: 'high',   status: 'qualified', source: 'Referido',    notes: 'Sociedad anónima, cierre previsto junio.', contactDate: '2026-04-19', createdAt: '2026-04-19T10:00:00Z' },
  { id: 'el18', assetId: 'ea2', unit: 'real_estate', name: 'Alejandra Moro',     email: 'amoro@vitalmoro.com',        phone: '+54 9 11 5555-1818', interest: 'medium', status: 'new',       source: 'Web',         notes: 'Busca segunda vivienda.', contactDate: '2026-04-23', createdAt: '2026-04-23T10:00:00Z' },
  { id: 'el19', assetId: 'em1', unit: 'media',       name: 'Pódcast Club BA',    email: 'hola@podcastclub.ar',        phone: '+54 9 11 5555-1919', interest: 'medium', status: 'contacted', source: 'Instagram',   notes: 'Colectivo de podcasters, busca alquiler mensual.', contactDate: '2026-04-17', createdAt: '2026-04-17T10:00:00Z' },
  { id: 'el20', assetId: 'ed3', unit: 'development', name: 'Logística Andina',   email: 'info@logandina.com.ar',      phone: '+54 9 11 5555-2020', interest: 'high',   status: 'proposal',  source: 'Referido',    notes: 'Necesitan depósito + oficinas, deciden en 2 semanas.', contactDate: '2026-04-06', createdAt: '2026-04-06T10:00:00Z' },
]

export const DEMO_ELEVARE_CONTRACTS = [
  { id: 'ec1', assetId: 'ea2', unit: 'real_estate', clientName: 'Carolina Funes',      clientEmail: 'cfunes@funes.ar',         amount: 620000, currency: 'USD', status: 'signed',    signedAt: '2026-04-20', createdAt: '2026-04-18T10:00:00Z' },
  { id: 'ec2', assetId: 'ed1', unit: 'development', clientName: 'Grupo Inversor Sur',  clientEmail: 'info@grupoinvsur.com',    amount: 200000, currency: 'USD', status: 'sent',      signedAt: '',           createdAt: '2026-04-15T10:00:00Z' },
  { id: 'ec3', assetId: 'eb1', unit: 'b2b',         clientName: 'BBVA Argentina',      clientEmail: 'negocios@bbva.ar',        amount: 0,      currency: 'USD', status: 'completed', signedAt: '2026-01-15', createdAt: '2025-12-01T10:00:00Z' },
  { id: 'ec4', assetId: 'em2', unit: 'media',       clientName: 'Agencia Bloom',       clientEmail: 'hola@agenciabloom.com',   amount: 35000,  currency: 'USD', status: 'draft',     signedAt: '',           createdAt: '2026-04-18T10:00:00Z' },
  { id: 'ec5', assetId: 'ee2', unit: 'events',      clientName: 'GrupoMagna Paraguay', clientEmail: 'info@grupomagna.py',      amount: 12000,  currency: 'USD', status: 'completed', signedAt: '2026-04-01', createdAt: '2026-03-30T10:00:00Z' },
  { id: 'ec6', assetId: 'ea1', unit: 'real_estate', clientName: 'Andrés Villanueva',   clientEmail: 'avillanueva@hedge.com',   amount: 850000, currency: 'USD', status: 'sent',      signedAt: '',           createdAt: '2026-04-10T10:00:00Z' },
  { id: 'ec7', assetId: 'eb2', unit: 'b2b',         clientName: 'TechCorp Argentina',  clientEmail: 'hgutierrez@techcorp.ar',  amount: 8500,   currency: 'USD', status: 'signed',    signedAt: '2026-04-22', createdAt: '2026-04-20T10:00:00Z' },
  { id: 'ec8', assetId: 'ed3', unit: 'development', clientName: 'Logística Andina',    clientEmail: 'info@logandina.com.ar',   amount: 1900000,currency: 'USD', status: 'draft',     signedAt: '',           createdAt: '2026-04-21T10:00:00Z' },
]

export const DEMO_TEAM_MEMBERS = [
  { id: 'tm1',  name: 'Valentina Rossi',   email: 'v.rossi@resiliolife.com',    role: 'admin',    department: 'resilio',     phone: '+54 9 11 6001-0001', status: 'active',   permissions: ['view_all','edit_projects','manage_team','view_analytics','export_data','manage_billing'], joinedAt: '2023-01-15' },
  { id: 'tm2',  name: 'Mateo Giménez',     email: 'm.gimenez@resiliolife.com',  role: 'director', department: 'resilio',     phone: '+54 9 11 6001-0002', status: 'active',   permissions: ['view_all','edit_projects','manage_team','view_analytics','export_data'], joinedAt: '2023-02-01' },
  { id: 'tm3',  name: 'Lucía Herrera',     email: 'l.herrera@resiliolife.com',  role: 'manager',  department: 'creative',    phone: '+54 9 11 6001-0003', status: 'active',   permissions: ['view_all','edit_projects','view_analytics'], joinedAt: '2023-05-10' },
  { id: 'tm4',  name: 'Tomás Aguirre',     email: 't.aguirre@resiliolife.com',  role: 'director', department: 'elevare',     phone: '+54 9 11 6001-0004', status: 'active',   permissions: ['view_all','edit_projects','manage_team','view_analytics','export_data'], joinedAt: '2023-03-20' },
  { id: 'tm5',  name: 'Camila Esteve',     email: 'c.esteve@resiliolife.com',   role: 'manager',  department: 'influencers', phone: '+54 9 11 6001-0005', status: 'active',   permissions: ['view_all','edit_projects','view_analytics'], joinedAt: '2023-07-01' },
  { id: 'tm6',  name: 'Rodrigo Vidal',     email: 'r.vidal@resiliolife.com',    role: 'member',   department: 'elevare',     phone: '+54 9 11 6001-0006', status: 'active',   permissions: ['view_all','view_analytics'], joinedAt: '2024-01-15' },
  { id: 'tm7',  name: 'Daniela Voss',      email: 'd.voss@resiliolife.com',     role: 'manager',  department: 'events',      phone: '+54 9 11 6001-0007', status: 'active',   permissions: ['view_all','edit_projects','view_analytics'], joinedAt: '2023-09-01' },
  { id: 'tm8',  name: 'Santiago Reyes',    email: 's.reyes@resiliolife.com',    role: 'member',   department: 'tech',        phone: '+54 9 11 6001-0008', status: 'active',   permissions: ['view_all','edit_projects'], joinedAt: '2024-02-01' },
  { id: 'tm9',  name: 'Florencia Ibáñez',  email: 'f.ibanez@resiliolife.com',   role: 'member',   department: 'creative',    phone: '+54 9 11 6001-0009', status: 'active',   permissions: ['view_all','view_analytics'], joinedAt: '2024-03-15' },
  { id: 'tm10', name: 'Ignacio Leiva',     email: 'i.leiva@resiliolife.com',    role: 'member',   department: 'resilio',     phone: '+54 9 11 6001-0010', status: 'active',   permissions: ['view_all'], joinedAt: '2024-04-01' },
  { id: 'tm11', name: 'Renata Salazar',    email: 'r.salazar@resiliolife.com',  role: 'member',   department: 'events',      phone: '+54 9 11 6001-0011', status: 'active',   permissions: ['view_all'], joinedAt: '2024-04-10' },
  { id: 'tm12', name: 'Lucas Ferreira',    email: 'l.ferreira@resiliolife.com', role: 'member',   department: 'influencers', phone: '+54 9 11 6001-0012', status: 'inactive', permissions: ['view_all'], joinedAt: '2023-11-01' },
]

// ── Phase 5: Missions ────────────────────────────────────────────────────────
export const DEMO_MISSIONS = [
  // Influencer missions (10)
  { id: 'im1',  type:'influencer', title:'Repost Historia Lanzamiento',         description:'Compartir story de @resilio_life sobre el nuevo lanzamiento de membresías Premium. Mencionar el link en bio.',       category:'story',   status:'approved',  points:500,  difficulty:'easy',   deadline:'2026-04-28', assignedTo:'@sofia.fit',     evidence:'Historia publicada el 25/04, alcanzó 8.2K vistas.',    completedAt:'2026-04-25T14:00:00Z', approvedAt:'2026-04-25T18:00:00Z', rejectedAt:null, createdAt:'2026-04-20T10:00:00Z' },
  { id: 'im2',  type:'influencer', title:'Review Marca Adidas Partnership',      description:'Publicar reseña auténtica del calzado Adidas Ultraboost en feed + story. Incluir código RESILIO20.',                category:'review',  status:'review',    points:1200, difficulty:'medium', deadline:'2026-05-02', assignedTo:'@lucas_moves',   evidence:'Post publicado con 15K likes y 340 comentarios.',       completedAt:'2026-04-24T11:00:00Z', approvedAt:null, rejectedAt:null, createdAt:'2026-04-18T10:00:00Z' },
  { id: 'im3',  type:'influencer', title:'Live Shopping Beneficios',             description:'Hacer un live en Instagram (mín. 30 min) mostrando los beneficios activos del mes en la app Resilio.',                category:'social',  status:'active',    points:2000, difficulty:'hard',   deadline:'2026-05-05', assignedTo:'@cami.wellness',  evidence:null, completedAt:null, approvedAt:null, rejectedAt:null, createdAt:'2026-04-22T10:00:00Z' },
  { id: 'im4',  type:'influencer', title:'Unboxing Kit Bienvenida',              description:'Video unboxing del kit de bienvenida Resilio Premium. Duración mín. 3 min. Publicar en Reels y TikTok.',               category:'video',   status:'approved',  points:800,  difficulty:'medium', deadline:'2026-04-25', assignedTo:'@meli.style',    evidence:'Reel con 45K views en 24h. TikTok 22K views.',           completedAt:'2026-04-24T16:00:00Z', approvedAt:'2026-04-25T09:00:00Z', rejectedAt:null, createdAt:'2026-04-17T10:00:00Z' },
  { id: 'im5',  type:'influencer', title:'Collab Post con Otro Influencer',      description:'Publicar contenido en collab con otro influencer del network Resilio. Tema libre, mención a ambas cuentas.',           category:'content', status:'active',    points:1500, difficulty:'hard',   deadline:'2026-05-10', assignedTo:'@nico.sports',   evidence:null, completedAt:null, approvedAt:null, rejectedAt:null, createdAt:'2026-04-23T10:00:00Z' },
  { id: 'im6',  type:'influencer', title:'Tutorial Uso App Resilio',             description:'Guía paso a paso de cómo usar la app: registro, membresía, escaneo QR. Formato Reels de 60 seg.',                    category:'video',   status:'review',    points:900,  difficulty:'medium', deadline:'2026-04-30', assignedTo:'@juli.fitness',  evidence:'Reel subido, pendiente de revisión de branding.',        completedAt:'2026-04-24T13:00:00Z', approvedAt:null, rejectedAt:null, createdAt:'2026-04-19T10:00:00Z' },
  { id: 'im7',  type:'influencer', title:'Story Poll: Beneficio Favorito',       description:'Crear story interactivo con encuesta sobre cuál es el beneficio favorito de los seguidores. Reportar resultados.',     category:'story',   status:'completed', points:300,  difficulty:'easy',   deadline:'2026-04-22', assignedTo:'@romi.beauty',   evidence:'Poll con 2.1K votos. Descuento Adidas ganó con 67%.',    completedAt:'2026-04-21T20:00:00Z', approvedAt:null, rejectedAt:null, createdAt:'2026-04-18T10:00:00Z' },
  { id: 'im8',  type:'influencer', title:'Post Evento Networking Mayo',          description:'Cubrir el evento Resilio Networking del 8 de mayo. Stories en vivo + post recap al día siguiente.',                   category:'event',   status:'active',    points:1800, difficulty:'hard',   deadline:'2026-05-09', assignedTo:'@fede.viajes',   evidence:null, completedAt:null, approvedAt:null, rejectedAt:null, createdAt:'2026-04-24T10:00:00Z' },
  { id: 'im9',  type:'influencer', title:'Mencionar en Bio por 1 Semana',        description:'Agregar link de Resilio en la bio durante 7 días consecutivos y hacer screenshot diario como evidencia.',              category:'social',  status:'rejected',  points:400,  difficulty:'easy',   deadline:'2026-04-20', assignedTo:'@pau.foodie',    evidence:'Bio solo se mantuvo 2 días, no cumplió los 7 días.',     completedAt:'2026-04-18T10:00:00Z', approvedAt:null, rejectedAt:'2026-04-20T10:00:00Z', createdAt:'2026-04-13T10:00:00Z' },
  { id: 'im10', type:'influencer', title:'Campaña Hashtag #ResilioLife',         description:'Crear y publicar 3 posts con el hashtag #ResilioLife durante la semana. Cada post debe tener temática diferente.',      category:'content', status:'active',    points:600,  difficulty:'medium', deadline:'2026-05-07', assignedTo:'@mati.run',      evidence:null, completedAt:null, approvedAt:null, rejectedAt:null, createdAt:'2026-04-24T10:00:00Z' },
  // Creator missions (8)
  { id: 'cm1',  type:'creator',    title:'Video Tutorial Membresías Resilio',    description:'Crear video educativo (5-10 min) explicando los tipos de membresía y sus beneficios. Publicar en YouTube y compartir.',category:'video',   status:'approved',  points:2500, difficulty:'hard',   deadline:'2026-04-28', assignedTo:'Mundo Fit AR',   evidence:'YouTube: 18K views en 48h. 340 suscriptores nuevos.',    completedAt:'2026-04-25T10:00:00Z', approvedAt:'2026-04-25T16:00:00Z', rejectedAt:null, createdAt:'2026-04-15T10:00:00Z' },
  { id: 'cm2',  type:'creator',    title:'Blog Post SEO: Beneficios Fitness',    description:'Artículo de 1500+ palabras optimizado para "beneficios fitness Buenos Aires". Incluir links afiliados Resilio.',     category:'content', status:'review',    points:1800, difficulty:'medium', deadline:'2026-05-01', assignedTo:'FitBlog.com.ar', evidence:'Artículo publicado, en revisión de quality check SEO.',  completedAt:'2026-04-24T09:00:00Z', approvedAt:null, rejectedAt:null, createdAt:'2026-04-18T10:00:00Z' },
  { id: 'cm3',  type:'creator',    title:'Podcast: Entrevista Equipo Resilio',   description:'Episodio de podcast (mín. 20 min) entrevistando a un miembro del equipo Resilio sobre la red de beneficios.',        category:'content', status:'active',    points:3000, difficulty:'hard',   deadline:'2026-05-12', assignedTo:'Bienestar Podcast',evidence:null, completedAt:null, approvedAt:null, rejectedAt:null, createdAt:'2026-04-22T10:00:00Z' },
  { id: 'cm4',  type:'creator',    title:'Newsletter Feature Resilio',           description:'Dedicar una sección del newsletter mensual a presentar Resilio Life a la audiencia. Mín. 2000 suscriptores.',           category:'content', status:'approved',  points:1200, difficulty:'easy',   deadline:'2026-04-30', assignedTo:'BA Wellness',    evidence:'Newsletter enviado a 4.8K suscriptores. Open rate 38%.', completedAt:'2026-04-23T11:00:00Z', approvedAt:'2026-04-24T14:00:00Z', rejectedAt:null, createdAt:'2026-04-16T10:00:00Z' },
  { id: 'cm5',  type:'creator',    title:'Webinar: Ahorro con Beneficios',       description:'Organizar webinar gratuito sobre cómo maximizar ahorros usando redes de beneficios. Co-branded con Resilio.',           category:'event',   status:'active',    points:4000, difficulty:'hard',   deadline:'2026-05-20', assignedTo:'Finanzas AR',    evidence:null, completedAt:null, approvedAt:null, rejectedAt:null, createdAt:'2026-04-23T10:00:00Z' },
  { id: 'cm6',  type:'creator',    title:'Guía PDF Descargable',                 description:'Crear guía PDF "Top 20 Beneficios Resilio en CABA" para lead magnet. Diseño profesional, formato A4.',                 category:'content', status:'review',    points:1500, difficulty:'medium', deadline:'2026-05-03', assignedTo:'Diseño y Vida',  evidence:'PDF creado, enviado para revisión de contenido y brand.', completedAt:'2026-04-24T15:00:00Z', approvedAt:null, rejectedAt:null, createdAt:'2026-04-19T10:00:00Z' },
  { id: 'cm7',  type:'creator',    title:'Comparativa Membresías: Thread X',     description:'Thread en X/Twitter comparando planes de membresías wellness en CABA. Resilio como mejor opción calidad-precio.',     category:'social',  status:'completed', points:700,  difficulty:'easy',   deadline:'2026-04-23', assignedTo:'TechWellness',   evidence:'Thread con 850 impresiones, 120 RT y 45 respuestas.',    completedAt:'2026-04-22T18:00:00Z', approvedAt:null, rejectedAt:null, createdAt:'2026-04-17T10:00:00Z' },
  { id: 'cm8',  type:'creator',    title:'Case Study: ROI Membresía Premium',    description:'Documento case study con datos reales de ahorro de un miembro Premium durante 3 meses. Incluir gráficos.',           category:'content', status:'active',    points:2200, difficulty:'hard',   deadline:'2026-05-15', assignedTo:'BizInsight BA',  evidence:null, completedAt:null, approvedAt:null, rejectedAt:null, createdAt:'2026-04-24T10:00:00Z' },
]

export const DEMO_NOTIFICATIONS = [
  { id:'n1',  type:'mission',  title:'Misión en revisión',         body:'@lucas_moves entregó evidencia para "Review Adidas"',           read:false, createdAt:'2026-04-24T16:30:00Z' },
  { id:'n2',  type:'mission',  title:'Misión en revisión',         body:'FitBlog.com.ar subió el blog post para revisión SEO',           read:false, createdAt:'2026-04-24T14:00:00Z' },
  { id:'n3',  type:'mission',  title:'Misión en revisión',         body:'@juli.fitness publicó el tutorial de la app Resilio',           read:false, createdAt:'2026-04-24T13:15:00Z' },
  { id:'n4',  type:'elevare',  title:'Lead de alto interés',       body:'Andrés Villanueva actualizó su interés en Palermo Soho',        read:false, createdAt:'2026-04-24T11:00:00Z' },
  { id:'n5',  type:'mission',  title:'Misión aprobada ✓',          body:'"Video Tutorial Membresías" aprobado — 2500 pts otorgados',     read:true,  createdAt:'2026-04-25T09:00:00Z' },
  { id:'n6',  type:'elevare',  title:'Contrato firmado',           body:'TechCorp Argentina firmó contrato B2B — USD 8.500',             read:true,  createdAt:'2026-04-22T15:00:00Z' },
  { id:'n7',  type:'creative', title:'Proyecto entregado',         body:'Proyecto Nike SS2026 marcado como completado',                  read:true,  createdAt:'2026-04-21T10:00:00Z' },
  { id:'n8',  type:'campaign', title:'Campaña finalizada',         body:'Campaña FitLife Q2 alcanzó 95% de sus KPIs objetivo',           read:true,  createdAt:'2026-04-20T14:00:00Z' },
]
