export const toFirestoreValue = (val) => {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') return { integerValue: String(val) };
  if (typeof val === 'boolean') return { booleanValue: val };
  return { stringValue: String(val) };
};

export const fromFirestoreValue = (val) => {
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return val.doubleValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('nullValue' in val) return null;
  return null;
};

export const docToObject = (doc) => {
  if (!doc?.fields) return {};
  const obj = {};

  for (const [key, val] of Object.entries(doc.fields)) {
    obj[key] = fromFirestoreValue(val);
  }

  obj.id = doc.name?.split('/').pop();
  return obj;
};

export const toFields = (obj) => {
  const fields = {};

  for (const [key, val] of Object.entries(obj)) {
    fields[key] = toFirestoreValue(val);
  }

  return { fields };
};
