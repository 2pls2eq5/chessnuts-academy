export const STUDENT_LEVELS = [
  {
    value: 'BASIC_1',
    label: 'Basic I',
  },
  {
    value: 'BASIC_2',
    label: 'Basic II',
  },
  {
    value: 'INTERMEDIATE_1',
    label: 'Intermediate I',
  },
  {
    value: 'INTERMEDIATE_2',
    label: 'Intermediate II',
  },
  {
    value: 'PRE_ADVANCED',
    label: 'Pre-Advanced',
  },
  {
    value: 'ADVANCED_1',
    label: 'Advanced I',
  },
  {
    value: 'ADVANCED_2',
    label: 'Advanced II',
  },
  {
    value: 'EXPERT_1',
    label: 'Expert I',
  },
  {
    value: 'EXPERT_2',
    label: 'Expert II',
  },
]

export function getStudentLevelLabel(value) {
  const level = STUDENT_LEVELS.find(
    (item) => item.value === value
  )

  return level?.label || value
}
