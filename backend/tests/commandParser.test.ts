import { describe, it, expect, beforeEach } from 'vitest';
import { CommandParser } from '../src/services/chat/CommandParser';

describe('CommandParser', () => {
  let parser: CommandParser;

  beforeEach(() => {
    parser = new CommandParser();
  });

  it('should detect job_scan intent', () => {
    const result = parser.parse('scan jobs on upwork');
    expect(result.intent).toBe('job_scan');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('should detect product_scan intent', () => {
    const result = parser.parse('scan dropshipping products from aliexpress');
    expect(result.intent).toBe('product_scan');
  });

  it('should detect generate_proposal intent', () => {
    const result = parser.parse('generate proposal for React Developer job');
    expect(result.intent).toBe('generate_proposal');
    expect(result.entities).toHaveProperty('jobTitle');
  });

  it('should detect create_invoice intent', () => {
    const result = parser.parse('create an invoice for John Smith');
    expect(result.intent).toBe('create_invoice');
  });

  it('should detect view_analytics intent', () => {
    const result = parser.parse('show me analytics');
    expect(result.intent).toBe('view_analytics');
  });

  it('should detect system_status intent', () => {
    const result = parser.parse('system status');
    expect(result.intent).toBe('system_status');
  });

  it('should default to general_chat for unrecognised input', () => {
    const result = parser.parse('what is the meaning of life?');
    expect(result.intent).toBe('general_chat');
  });

  it('should detect optimize_ads intent', () => {
    const result = parser.parse('optimize all ads');
    expect(result.intent).toBe('optimize_ads');
  });

  it('should detect validate_product intent', () => {
    const result = parser.parse('validate product Galaxy Projector');
    expect(result.intent).toBe('validate_product');
  });

  it('should return rawText unchanged', () => {
    const message = 'scan jobs on fiverr please';
    const result = parser.parse(message);
    expect(result.rawText).toBe(message);
  });
});
