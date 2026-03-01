import type { ConfigNodeType } from './configTypes';

export interface ConnectionRule {
  id: string;
  sourceType: ConfigNodeType;
  targetType: ConfigNodeType;
  allowed: boolean;
  reason: string;
}

export interface DependencySuggestion {
  type: ConfigNodeType;
  label: string;
  reason: string;
  required: boolean;
}

// Recommended parent→child connections (advisory, not enforced)
export const CONNECTION_RULES: ConnectionRule[] = [
  { id: 'c_m', sourceType: 'container', targetType: 'module', allowed: true, reason: 'Containers hold modules' },
  { id: 'm_g', sourceType: 'module', targetType: 'group', allowed: true, reason: 'Modules hold groups' },
  { id: 'g_o', sourceType: 'group', targetType: 'option', allowed: true, reason: 'Groups hold options' },
  // Cross-level connections are allowed but warned
  { id: 'c_g', sourceType: 'container', targetType: 'group', allowed: true, reason: 'Direct container→group (skips module)' },
  { id: 'c_o', sourceType: 'container', targetType: 'option', allowed: true, reason: 'Direct container→option (skips hierarchy)' },
  { id: 'm_o', sourceType: 'module', targetType: 'option', allowed: true, reason: 'Direct module→option (skips group)' },
  // Cross-type connections
  { id: 'o_o', sourceType: 'option', targetType: 'option', allowed: true, reason: 'Option dependency link' },
  { id: 'o_g', sourceType: 'option', targetType: 'group', allowed: true, reason: 'Option→group reference' },
  { id: 'o_m', sourceType: 'option', targetType: 'module', allowed: true, reason: 'Option→module reference' },
  { id: 'g_m', sourceType: 'group', targetType: 'module', allowed: true, reason: 'Group→module cross-reference' },
  { id: 'g_g', sourceType: 'group', targetType: 'group', allowed: true, reason: 'Group→group link' },
  { id: 'm_m', sourceType: 'module', targetType: 'module', allowed: true, reason: 'Module→module dependency' },
];

// What each node type needs
export const DEPENDENCY_RULES: Record<ConfigNodeType, DependencySuggestion[]> = {
  container: [
    { type: 'module', label: 'Add Module', reason: 'Containers need at least one module', required: true },
  ],
  module: [
    { type: 'group', label: 'Add Group', reason: 'Modules need at least one group', required: true },
  ],
  group: [
    { type: 'option', label: 'Add Option', reason: 'Groups should contain options', required: true },
    { type: 'option', label: 'Add Toggle', reason: 'Consider adding a toggle option', required: false },
  ],
  option: [],
};

export type ConnectionWarningLevel = 'ok' | 'info' | 'warning';

export interface ConnectionValidation {
  valid: boolean;
  message: string;
  warningLevel: ConnectionWarningLevel;
}

// Standard hierarchy order
const HIERARCHY_ORDER: Record<ConfigNodeType, number> = {
  container: 0,
  module: 1,
  group: 2,
  option: 3,
};

export const validateConnection = (
  sourceType: ConfigNodeType,
  targetType: ConfigNodeType
): ConnectionValidation => {
  // Self-loop is not allowed
  if (sourceType === targetType) {
    return {
      valid: true,
      message: `${sourceType}→${targetType} peer link`,
      warningLevel: 'info',
    };
  }

  const srcOrder = HIERARCHY_ORDER[sourceType];
  const tgtOrder = HIERARCHY_ORDER[targetType];

  // Standard top-down and exactly one level
  if (tgtOrder === srcOrder + 1) {
    return { valid: true, message: `Standard: ${sourceType} → ${targetType}`, warningLevel: 'ok' };
  }

  // Top-down but skipping levels
  if (tgtOrder > srcOrder) {
    return {
      valid: true,
      message: `Cross-level: ${sourceType} → ${targetType} (skips hierarchy)`,
      warningLevel: 'info',
    };
  }

  // Bottom-up or reverse
  return {
    valid: true,
    message: `Reverse link: ${sourceType} → ${targetType} (non-standard direction)`,
    warningLevel: 'warning',
  };
};

export const getUniquenessViolation = (
  sourceId: string,
  targetId: string,
  existingEdges: { source: string; target: string }[]
): string | null => {
  // Don't connect to self
  if (sourceId === targetId) return 'Cannot connect a node to itself';

  const duplicate = existingEdges.find(
    (e) => e.source === sourceId && e.target === targetId
  );
  if (duplicate) return 'This connection already exists';

  // Allow multiple parents now - rule engine will flag if it's a problem
  return null;
};
