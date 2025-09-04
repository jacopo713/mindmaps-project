/**
 * Calculate optimal node dimensions based on text content
 * Base dimensions: 120x65px (conservative approach - encourages detailed content)
 * Auto-resize logic: generous sizing to stimulate user reflection
 * Text display: Dynamic line calculation ensures full content visibility
 */

export interface NodeDimensions {
  width: number;
  height: number;
}

export interface TextDisplayOptions {
  optimalLines: number;
  showEllipsis: boolean;
}

export const calculateNodeSize = (text: string): NodeDimensions => {
  const baseWidth = 120;
  const baseHeight = 65;
  
  // Trim and handle empty text
  const trimmedText = text.trim();
  if (!trimmedText) {
    return { width: baseWidth, height: baseHeight };
  }
  
  const textLength = trimmedText.length;
  
  // Conservative approach: generous base size encourages detailed content
  if (textLength <= 18) {
    // Base size for most texts: "Strategia Marketing Digitale"
    return { width: 120, height: 65 };
  }
  
  if (textLength <= 28) {
    // Expanded for detailed descriptions: "Team Building Trimestrale Q1"
    return { width: 140, height: 70 };
  }
  
  if (textLength <= 40) {
    // Long descriptive texts: "Budget Operativo Marketing 2024"
    return { width: 160, height: 80 };
  }
  
  // Very long texts - calculate dynamically with generous limits
  const words = trimmedText.split(/\s+/);
  const estimatedLines = Math.ceil(textLength / 22); // Slightly longer lines expected
  const actualLines = Math.min(estimatedLines, 4); // Max 4 lines
  
  // Dynamic width based on longest word or estimated width
  const longestWord = Math.max(...words.map(word => word.length));
  const estimatedWidth = Math.max(
    baseWidth + (longestWord * 6), // ~6px per character
    baseWidth + (textLength * 2.5) // More generous expansion
  );
  
  // Dynamic height based on lines
  const estimatedHeight = baseHeight + ((actualLines - 1) * 16); // 16px per additional line
  
  return {
    width: Math.min(220, Math.max(baseWidth, estimatedWidth)), // Higher max width
    height: Math.min(130, Math.max(baseHeight, estimatedHeight)) // Higher max height
  };
};

/**
 * Get default node dimensions (conservative base size)
 */
export const getDefaultNodeSize = (): NodeDimensions => {
  return { width: 120, height: 65 };
};

/**
 * Check if text needs auto-resize (longer than conservative base capacity)
 */
export const needsAutoResize = (text: string): boolean => {
  return text.trim().length > 18; // Higher threshold for conservative approach
};

/**
 * Calculate optimal number of text lines based on node dimensions
 * Ensures text uses all available vertical space in the node
 */
export const calculateOptimalLines = (nodeDimensions: NodeDimensions): number => {
  const lineHeight = 20; // px per line (based on line-height: 1.25 * 16px font)
  const verticalPadding = 16; // Total vertical padding (8px top + 8px bottom)
  const availableHeight = nodeDimensions.height - verticalPadding;
  const maxPossibleLines = Math.floor(availableHeight / lineHeight);
  
  // Ensure at least 1 line, maximum 5 lines for readability
  return Math.max(1, Math.min(maxPossibleLines, 5));
};

/**
 * Calculate if text should show ellipsis based on content and available lines
 */
export const shouldShowEllipsis = (text: string, availableLines: number): boolean => {
  const estimatedLines = Math.ceil(text.length / 22); // ~22 chars per line estimate
  return estimatedLines > availableLines;
};

/**
 * Get complete text display options for a node
 */
export const getTextDisplayOptions = (text: string, nodeDimensions: NodeDimensions): TextDisplayOptions => {
  const optimalLines = calculateOptimalLines(nodeDimensions);
  const showEllipsis = shouldShowEllipsis(text, optimalLines);
  
  return {
    optimalLines,
    showEllipsis
  };
};