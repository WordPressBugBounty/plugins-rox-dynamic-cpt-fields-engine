/**
 * Per-module AI generation hook.
 *
 * Wraps `aiApi.moduleGenerate` so the AIGenerateButton component can
 * fire a single-module generation request and receive a form-ready
 * suggestion object without touching the full AI Assistant pipeline.
 *
 * @package DynamicCPTFieldsEngine
 */
import { useMutation } from '@tanstack/react-query';
import {
  aiApi,
  type AIModuleGenerateRequest,
  type AIModuleGenerateResponse,
} from '../services/api';

export function useModuleGenerate() {
  return useMutation<AIModuleGenerateResponse, Error, AIModuleGenerateRequest>({
    mutationFn: async (payload) => {
      const response = await aiApi.moduleGenerate(payload);
      return response.data;
    },
  });
}
