import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Mock affiliate product catalog for hackathon demo
// In production, this would call the Amazon Product Advertising API
const MOCK_PRODUCTS = {
  'communion tray': [
    { title: 'Communion Tray with Glass Inserts', price: '$45.99', url: 'https://www.amazon.com/s?k=communion+tray+with+glass+inserts', source: 'Amazon Associates' },
    { title: 'Stackable Communion Tray Set (4-piece)', price: '$89.99', url: 'https://www.amazon.com/s?k=stackable+communion+tray+set', source: 'Amazon Associates' },
    { title: 'Brass Communion Tray with Cover', price: '$129.99', url: 'https://www.amazon.com/s?k=brass+communion+tray+cover', source: 'Amazon Associates' },
  ],
  'hymnals': [
    { title: 'Hymnal Hardcover Edition (Case of 12)', price: '$299.99', url: 'https://www.amazon.com/s?k=hymnal+hardcover+case', source: 'Amazon Associates' },
    { title: 'Worship Hymnal Collection (Large Print)', price: '$39.99', url: 'https://www.amazon.com/s?k=worship+hymnal+large+print', source: 'Amazon Associates' },
  ],
  'baptismal font': [
    { title: 'Portable Baptismal Font (Folding)', price: '$189.99', url: 'https://www.amazon.com/s?k=portable+baptismal+font', source: 'Amazon Associates' },
    { title: 'Baptismal Pool Liner Replacement', price: '$79.99', url: 'https://www.amazon.com/s?k=baptismal+pool+liner', source: 'Amazon Associates' },
  ],
  'sound system': [
    { title: 'Church Sound System with Wireless Microphones', price: '$1,299.99', url: 'https://www.amazon.com/s?k=church+sound+system+wireless', source: 'Amazon Associates' },
    { title: 'Portable PA System for Worship', price: '$499.99', url: 'https://www.amazon.com/s?k=portable+pa+system+worship', source: 'Amazon Associates' },
  ],
  'projector': [
    { title: 'HD Church Projector 4000 Lumens', price: '$329.99', url: 'https://www.amazon.com/s?k=hd+church+projector+4000+lumens', source: 'Amazon Associates' },
    { title: 'Outdoor Projection Screen 120 inch', price: '$89.99', url: 'https://www.amazon.com/s?k=outdoor+projection+screen+120', source: 'Amazon Associates' },
  ],
  'piano': [
    { title: 'Digital Piano for Worship (88-key)', price: '$699.99', url: 'https://www.amazon.com/s?k=digital+piano+worship+88+key', source: 'Amazon Associates' },
    { title: 'Acoustic Upright Piano (Used)', price: '$1,899.00', url: 'https://www.amazon.com/s?k=acoustic+upright+piano', source: 'Amazon Associates' },
  ],
  'choir robes': [
    { title: 'Adult Choir Robes (Set of 10)', price: '$349.99', url: 'https://www.amazon.com/s?k=adult+choir+robes+set+of+10', source: 'Amazon Associates' },
    { title: 'Childrens Choir Robes (Set of 10)', price: '$249.99', url: 'https://www.amazon.com/s?k=childrens+choir+robes+set', source: 'Amazon Associates' },
  ],
};

function getDefaultProducts(resourceName) {
  return [
    { title: `${resourceName} - Standard Model`, price: '$49.99', url: `https://www.amazon.com/s?k=${encodeURIComponent(resourceName.toLowerCase())}`, source: 'Amazon Associates' },
    { title: `${resourceName} - Premium Model`, price: '$129.99', url: `https://www.amazon.com/s?k=${encodeURIComponent(resourceName.toLowerCase())}+premium`, source: 'Amazon Associates' },
  ];
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { resource_name } = body;
    if (!resource_name || !resource_name.trim()) {
      return Response.json({ error: 'resource_name is required' }, { status: 400 });
    }

    const key = resource_name.toLowerCase().trim();
    const results = MOCK_PRODUCTS[key] || getDefaultProducts(resource_name);

    return Response.json({
      resource_name,
      results,
      is_demo: true,
      demo_label: 'DEMO PURCHASE OPTIONS',
      affiliate_disclosure: 'These are external affiliate links. The Way may earn a commission from qualifying purchases. No items are purchased automatically.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}