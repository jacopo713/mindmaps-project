/**
 * Calculate optimal node dimensions based on text content
 * Base dimensions: 120x65px (conservative approach - encourages detailed content)
 * Auto-resize logic: generous sizing to stimulate user reflection
 * Mobile-optimized with adequate touch targets
 * 
 * IMPORTANT: All calculations account for centered text alignment which causes:
 * - Earlier line breaks (14 chars/line instead of 20)
 * - Wider character spacing due to fontWeight:600 + letterSpacing:0.2
 * - Need for additional safety margins to prevent clipping
 */

export interface NodeDimensions {
  width: number;
  height: number;
}

// Simple cache for node size calculations to avoid repeated computations
const nodeSizeCache = new Map<string, NodeDimensions>();

/**
 * Clear the node size cache (useful when font sizes or styles change)
 */
export const clearNodeSizeCache = () => {
  nodeSizeCache.clear();
};

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
  
  // Check cache first
  const cacheKey = trimmedText;
  if (nodeSizeCache.has(cacheKey)) {
    return nodeSizeCache.get(cacheKey)!;
  }
  
  const textLength = trimmedText.length;
  
  // Calculate dimensions based on text length
  let result: NodeDimensions;
  
  // More generous approach: prevent unnecessary ellipsis
  if (textLength <= 15) {
    // Short texts: names, simple labels
    result = { width: 120, height: 65 };
  } else if (textLength <= 20) {
    // Medium texts: "Strategia Marketing"
    result = { width: 160, height: 75 };
  } else if (textLength <= 30) {
    // Long texts: "Sviluppo Prodotto Innovativo"
    result = { width: 180, height: 85 };
  } else if (textLength <= 50) {
    // Very long texts: "Budget Operativo Marketing Department Q1"
    result = { width: 200, height: 95 };
  } else {
    // Very long texts - calculate dynamically with generous limits
    const words = trimmedText.split(/\s+/);
    // Use same factor as shouldShowEllipsis for consistency with centered text
    const centeredTextCharsPerLine = 16; // Increased from 14 to be more generous
    const estimatedLines = Math.ceil(textLength / centeredTextCharsPerLine);
    const actualLines = Math.min(estimatedLines, 5); // Max 5 lines instead of 4
    
    // Dynamic width based on longest word or estimated width
    const longestWord = Math.max(...words.map(word => word.length));
    // Correction for fontWeight 600 + letterSpacing 0.2: wider characters
    const charWidthFactor = 7.5; // Increased to be more generous
    const estimatedWidth = Math.max(
      baseWidth + (longestWord * charWidthFactor), // More space for long words
      baseWidth + (textLength * 3.5) // More generous expansion for centered text
    );
    
    // Dynamic height based on lines with extra safety margin
    const estimatedHeight = baseHeight + ((actualLines - 1) * 22) + 12; // More space per line + safety margin
    
    result = {
      width: Math.min(250, Math.max(baseWidth, estimatedWidth)), // Higher max width
      height: Math.min(150, Math.max(baseHeight, estimatedHeight)) // Higher max height
    };
  }
  
  // Cache the result
  nodeSizeCache.set(cacheKey, result);
  
  return result;
};

/**
 * Get default node dimensions (conservative base size)
 * Ensures adequate touch targets for mobile (120x65 > 44x44 minimum)
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
 * Mobile-optimized: Ensures text uses all available vertical space
 */
export const calculateOptimalLines = (nodeDimensions: NodeDimensions): number => {
  const lineHeight = 20; // px per line (based on React Native Text lineHeight)
  const verticalPadding = 24; // Total vertical padding: 12px top + 12px bottom (matches styles.container)
  const safetyMargin = 8; // Reduced safety margin for better space utilization
  const availableHeight = nodeDimensions.height - verticalPadding - safetyMargin;
  const maxPossibleLines = Math.floor(availableHeight / lineHeight);
  
  // Ensure at least 1 line, maximum 5 lines for mobile readability
  return Math.max(1, Math.min(maxPossibleLines, 5));
};

/**
 * Calculate characters per line based on node width and font properties
 * Accounts for centered text, fontWeight 600, and letterSpacing 0.2
 */
export const calculateCharsPerLine = (nodeWidth: number): number => {
  // Base calculation: average character width for bold text with letter spacing
  // For fontWeight 600 + letterSpacing 0.2, characters are wider than normal
  const avgCharWidth = 7.5; // pixels per character (conservative estimate)
  const horizontalPadding = 24; // 12px left + 12px right padding
  const availableWidth = nodeWidth - horizontalPadding;
  
  // Calculate how many characters can fit in the available width
  const charsPerLine = Math.floor(availableWidth / avgCharWidth);
  
  // Ensure minimum and maximum reasonable values
  return Math.max(8, Math.min(25, charsPerLine));
};

/**
 * Calculate if text should show ellipsis based on content and available lines
 * Accounts for centered text alignment and available width
 */
export const shouldShowEllipsis = (text: string, availableLines: number, nodeWidth: number): boolean => {
  const charsPerLine = calculateCharsPerLine(nodeWidth);
  const estimatedLines = Math.ceil(text.length / charsPerLine);
  
  return estimatedLines > availableLines;
};

/**
 * Get complete text display options for a mobile node
 */
export const getTextDisplayOptions = (text: string, nodeDimensions: NodeDimensions): TextDisplayOptions => {
  const optimalLines = calculateOptimalLines(nodeDimensions);
  const showEllipsis = shouldShowEllipsis(text, optimalLines, nodeDimensions.width);
  
  return {
    optimalLines,
    showEllipsis
  };
};