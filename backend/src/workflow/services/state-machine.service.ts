import { Injectable, BadRequestException } from '@nestjs/common';

export interface StateDefinition {
  name: string;
  label: string;
  description?: string;
  isInitial?: boolean;
  isFinal?: boolean;
  color?: string;
}

export interface TransitionDefinition {
  from: string;
  to: string;
  action: string;
  label: string;
  roles?: string[];
  permissions?: string[];
  requireComment?: boolean;
  requireApproval?: boolean;
  condition?: string;
}

export const DEFAULT_WORKFLOW_STATES: StateDefinition[] = [
  { name: 'draft', label: 'Draft', description: 'Document is being created', isInitial: true, color: 'gray' },
  { name: 'submitted', label: 'Submitted', description: 'Document has been submitted for review', color: 'blue' },
  { name: 'under_review', label: 'Under Review', description: 'Document is being reviewed', color: 'yellow' },
  { name: 'approved', label: 'Approved', description: 'Document has been approved', color: 'green' },
  { name: 'rejected', label: 'Rejected', description: 'Document has been rejected', color: 'red' },
  { name: 'completed', label: 'Completed', description: 'Document process is complete', isFinal: true, color: 'emerald' },
  { name: 'cancelled', label: 'Cancelled', description: 'Document has been cancelled', isFinal: true, color: 'gray' },
  { name: 'closed', label: 'Closed', description: 'Document is closed', isFinal: true, color: 'slate' },
];

export const DEFAULT_TRANSITIONS: TransitionDefinition[] = [
  { from: 'draft', to: 'submitted', action: 'submit', label: 'Submit', requireComment: false },
  { from: 'draft', to: 'cancelled', action: 'cancel', label: 'Cancel', requireComment: true },
  { from: 'submitted', to: 'under_review', action: 'review', label: 'Send for Review', requireComment: true },
  { from: 'submitted', to: 'rejected', action: 'reject', label: 'Reject', requireComment: true },
  { from: 'submitted', to: 'draft', action: 'return', label: 'Return to Draft', requireComment: true },
  { from: 'under_review', to: 'approved', action: 'approve', label: 'Approve', requireComment: false },
  { from: 'under_review', to: 'rejected', action: 'reject', label: 'Reject', requireComment: true },
  { from: 'under_review', to: 'draft', action: 'return', label: 'Return to Draft', requireComment: true },
  { from: 'approved', to: 'completed', action: 'complete', label: 'Complete', requireComment: false },
  { from: 'approved', to: 'under_review', action: 'reopen', label: 'Reopen Review', requireComment: true },
  { from: 'approved', to: 'cancelled', action: 'cancel', label: 'Cancel', requireComment: true },
  { from: 'rejected', to: 'draft', action: 'resubmit', label: 'Resubmit', requireComment: true },
  { from: 'rejected', to: 'cancelled', action: 'cancel', label: 'Cancel', requireComment: false },
  { from: 'completed', to: 'closed', action: 'close', label: 'Close', requireComment: false },
  { from: 'completed', to: 'under_review', action: 'reopen', label: 'Reopen', requireComment: true },
  { from: 'cancelled', to: 'draft', action: 'reopen', label: 'Reopen', requireComment: true },
  { from: 'closed', to: 'under_review', action: 'reopen', label: 'Reopen', requireComment: true },
];

@Injectable()
export class StateMachineService {
  private readonly states: Map<string, StateDefinition[]> = new Map();
  private readonly transitions: Map<string, TransitionDefinition[]> = new Map();

  /**
   * Register a workflow template's states and transitions.
   */
  registerTemplate(templateId: string, states: StateDefinition[], transitions: TransitionDefinition[]): void {
    this.states.set(templateId, states);
    this.transitions.set(templateId, transitions);
  }

  /**
   * Get allowed states for a template.
   */
  getStates(templateId: string): StateDefinition[] {
    return this.states.get(templateId) || DEFAULT_WORKFLOW_STATES;
  }

  /**
   * Get allowed transitions from a given state for a template.
   */
  getTransitionsFrom(templateId: string, fromState: string): TransitionDefinition[] {
    const allTransitions = this.transitions.get(templateId) || DEFAULT_TRANSITIONS;
    return allTransitions.filter((t) => t.from === fromState);
  }

  /**
   * Validate that a transition is legal (from → to via action).
   * Throws BadRequestException if the transition is not allowed.
   */
  validateTransition(templateId: string, fromState: string, action: string): TransitionDefinition {
    const allTransitions = this.transitions.get(templateId) || DEFAULT_TRANSITIONS;
    const transition = allTransitions.find((t) => t.from === fromState && t.action === action);

    if (!transition) {
      const validActions = allTransitions.filter((t) => t.from === fromState).map((t) => `"${t.action}" (→ ${t.to})`);
      throw new BadRequestException(
        `Illegal transition: cannot "${action}" from state "${fromState}". ` +
        `Valid actions: ${validActions.join(', ') || 'none'}.`,
      );
    }

    return transition;
  }

  /**
   * Get the next state for a given action.
   */
  getNextState(templateId: string, fromState: string, action: string): string {
    const transition = this.validateTransition(templateId, fromState, action);
    return transition.to;
  }

  /**
   * Check if a state is a final/terminal state.
   */
  isFinalState(templateId: string, state: string): boolean {
    const allStates = this.getStates(templateId);
    const def = allStates.find((s) => s.name === state);
    return def?.isFinal || false;
  }

  /**
   * Check if a state is an initial state.
   */
  isInitialState(templateId: string, state: string): boolean {
    const allStates = this.getStates(templateId);
    const def = allStates.find((s) => s.name === state);
    return def?.isInitial || false;
  }

  /**
   * Get the default workflow states (for templates without custom states).
   */
  getDefaultStates(): StateDefinition[] {
    return DEFAULT_WORKFLOW_STATES;
  }

  /**
   * Get the default transitions.
   */
  getDefaultTransitions(): TransitionDefinition[] {
    return DEFAULT_TRANSITIONS;
  }
}
