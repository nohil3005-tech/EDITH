import { describe, it, expect, vi } from 'vitest';

describe('AgentRegistry', () => {
  it('should list all 18 agents', async () => {
    const { AgentRegistry } = await import('../src/services/agents/AgentRegistry');
    const agents = AgentRegistry.listAll();
    expect(agents.length).toBe(18);
  });

  it('should list 13 freelance agents', async () => {
    const { AgentRegistry } = await import('../src/services/agents/AgentRegistry');
    const freelance = AgentRegistry.listFreelance();
    expect(freelance.length).toBe(13);
  });

  it('should list 5 dropshipping agents', async () => {
    const { AgentRegistry } = await import('../src/services/agents/AgentRegistry');
    const dropshipping = AgentRegistry.listDropshipping();
    expect(dropshipping.length).toBe(5);
  });

  it('should validate agent names correctly', async () => {
    const { AgentRegistry } = await import('../src/services/agents/AgentRegistry');
    expect(AgentRegistry.isValid('content-writer')).toBe(true);
    expect(AgentRegistry.isValid('optimizer')).toBe(true);
    expect(AgentRegistry.isValid('unknown-agent')).toBe(false);
    expect(AgentRegistry.isValid('')).toBe(false);
  });

  it('should throw for unknown agent name', async () => {
    const { AgentRegistry } = await import('../src/services/agents/AgentRegistry');
    expect(() => AgentRegistry.get('non-existent-agent')).toThrow();
  });

  it('should return singleton instance for same agent name', async () => {
    const { AgentRegistry } = await import('../src/services/agents/AgentRegistry');
    const agent1 = AgentRegistry.get('seo-specialist');
    const agent2 = AgentRegistry.get('seo-specialist');
    expect(agent1).toBe(agent2);
  });

  it('should return different instances for different agent names', async () => {
    const { AgentRegistry } = await import('../src/services/agents/AgentRegistry');
    const agent1 = AgentRegistry.get('content-writer');
    const agent2 = AgentRegistry.get('web-developer');
    expect(agent1).not.toBe(agent2);
  });

  it('should include all expected freelance agents', async () => {
    const { AgentRegistry } = await import('../src/services/agents/AgentRegistry');
    const freelance = AgentRegistry.listFreelance();
    expect(freelance).toContain('content-writer');
    expect(freelance).toContain('graphic-designer');
    expect(freelance).toContain('ui-ux-designer');
    expect(freelance).toContain('web-developer');
    expect(freelance).toContain('seo-specialist');
  });

  it('should include all expected dropshipping agents', async () => {
    const { AgentRegistry } = await import('../src/services/agents/AgentRegistry');
    const dropshipping = AgentRegistry.listDropshipping();
    expect(dropshipping).toContain('product-discovery');
    expect(dropshipping).toContain('product-validator');
    expect(dropshipping).toContain('store-builder');
    expect(dropshipping).toContain('ad-generator');
    expect(dropshipping).toContain('optimizer');
  });
});
