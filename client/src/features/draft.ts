import type {Mood} from '../lib/contracts';
export interface Draft {
  mood: Mood | null;
  influences: number[];
  title: string;
  body: string;
  step: 'mood' | 'reflection';
  operationId: string;
}
export type DraftAction =
  | {type: 'mood'; value: Mood}
  | {type: 'influence'; value: number}
  | {type: 'text'; field: 'title' | 'body'; value: string}
  | {type: 'step'; value: Draft['step']}
  | {type: 'reset'; operationId: string};
export const freshDraft = (operationId: string): Draft => ({
  mood: null,
  influences: [],
  title: '',
  body: '',
  step: 'mood',
  operationId,
});
export function draftReducer(state: Draft, action: DraftAction): Draft {
  switch (action.type) {
    case 'mood':
      return {...state, mood: action.value};
    case 'influence':
      return {
        ...state,
        influences: state.influences.includes(action.value)
          ? state.influences.filter((id) => id !== action.value)
          : [...state.influences, action.value].sort((a, b) => a - b),
      };
    case 'text':
      return {...state, [action.field]: action.value};
    case 'step':
      return {...state, step: action.value};
    case 'reset':
      return freshDraft(action.operationId);
  }
}
export const draftDirty = (
  draft: Pick<Draft, 'mood' | 'influences' | 'title' | 'body'>,
) =>
  draft.mood !== null ||
  draft.influences.length > 0 ||
  !!draft.title ||
  !!draft.body;
export function validateReflection(title: string, body: string) {
  return {
    title:
      Array.from(title).length > 50
        ? 'Keep the title to 50 characters or fewer.'
        : '',
    body:
      Array.from(body).length > 2000
        ? 'Keep the reflection to 2,000 characters or fewer.'
        : '',
  };
}
