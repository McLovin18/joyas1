/**
 * Función mejorada de búsqueda que es más precisa para números
 * - Para números: busca como palabra completa (ej: "5060" no coincide con "RTX5070")
 * - Para texto: busca con partial matching normal
 */
export function matchesSearch(text: string, searchTerm: string): boolean {
  if (!text || !searchTerm) return false;

  const normalizedText = text.toLowerCase().trim();
  const normalizedSearch = searchTerm.toLowerCase().trim();

  // Si la búsqueda es solo números, buscar como palabra completa
  if (/^\d+$/.test(normalizedSearch)) {
    // Crear regex que busque el número como palabra completa
    // \b = word boundary, pero para números puede no funcionar bien con modelos de word
    // Así que usamos una aproximación más simple: buscar el número separado por no-alfanuméricos o bordes
    const numberRegex = new RegExp(`(^|\\D|\\s)${normalizedSearch}(\\D|\\s|$)`);
    return numberRegex.test(normalizedText);
  }

  // Para texto mixto o solo letras, hacer búsqueda de palabras completas cuando sea posible
  // Pero también permitir partial matching en marcas/modelos
  const words = normalizedSearch.split(/\s+/);
  
  // Si es una sola palabra, buscar como palabra completa primero
  if (words.length === 1) {
    // Intentar búsqueda de palabra completa (para modelos como "RTX" completo)
    const wordRegex = new RegExp(`\\b${normalizedSearch}\\b`, 'i');
    if (wordRegex.test(normalizedText)) return true;
    
    // Si no encuentra como palabra completa, hacer partial matching
    // pero solo si es relativamente largo (3+ caracteres) para evitar falsos positivos
    if (normalizedSearch.length >= 3) {
      return normalizedText.includes(normalizedSearch);
    }
    
    // Para búsquedas muy cortas (1-2 letras), solo palabra completa
    return false;
  }

  // Para búsquedas multi-palabra, todas las palabras deben estar presentes
  return words.every(word => normalizedText.includes(word));
}

/**
 * Función para mejorar la búsqueda en un producto dado
 */
export function productMatches(
  producto: any,
  searchTerm: string
): boolean {
  if (!searchTerm.trim()) return true;

  const campos = [
    producto.nombre,
    producto.marca,
    producto.modelo,
    producto.categoria,
    producto.subcategoria,
    producto.subsubcategoria,
  ];

  return campos.some(campo => matchesSearch(String(campo || ""), searchTerm));
}
