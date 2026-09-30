// Etapas de relación (enum relationship_status: cold, warm, strong, inactive).
// Deslizar a la derecha avanza un escalón; a la izquierda retrocede.
export const STAGES = ['cold', 'warm', 'strong', 'inactive']
export const BOARD_STAGES = ['cold', 'warm', 'strong', 'inactive']

export const nextStage = (s) => ({ inactive: 'cold', cold: 'warm', warm: 'strong' })[s || 'cold'] || null
export const prevStage = (s) => ({ strong: 'warm', warm: 'cold', cold: 'inactive' })[s || 'cold'] || null

export const STAGE_COLOR = {
  cold: '#60A5FA', warm: '#F59E0B', strong: '#34D399', inactive: '#9CA3AF',
}
