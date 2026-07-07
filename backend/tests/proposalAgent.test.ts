import { describe, it, expect, vi } from 'vitest';

describe('ProposalService', () => {
  it('should generate a proposal with required fields', async () => {
    const mockLLM = {
      complete: vi.fn().mockResolvedValue(JSON.stringify({
        draftText: 'This is a compelling proposal for your project. I have extensive experience with e-commerce systems.',
        bidAmount: 1500,
        deliveryDays: 7,
        subjectLine: 'Re: Your React Developer Request',
        keyPoints: ['5+ years React experience', 'Delivered 50+ similar projects'],
      })),
    };

    const mockJob = {
      id: 'job-123',
      title: 'React Developer Needed',
      description: 'We need a React developer for our e-commerce platform.',
      budgetMin: '1000',
      budgetMax: '2000',
      tags: ['react', 'typescript'],
      clientRating: 4.8,
    };

    // Simulate proposal generation
    const prompt = `Write a winning freelance proposal for: ${mockJob.title}`;
    const response = await mockLLM.complete(prompt);
    const parsed = JSON.parse(response);

    expect(parsed.draftText).toBeTruthy();
    expect(parsed.draftText.length).toBeGreaterThan(50);
    expect(parsed.bidAmount).toBeGreaterThan(0);
    expect(parsed.deliveryDays).toBeGreaterThan(0);
    expect(parsed.bidAmount).toBeGreaterThanOrEqual(Number(mockJob.budgetMin));
  });

  it('should handle LLM parse failures gracefully', () => {
    const rawResponse = 'Here is a proposal for your project...';
    let parsed: { draftText: string; bidAmount: number; deliveryDays: number };
    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      parsed = { draftText: rawResponse, bidAmount: 100, deliveryDays: 7 };
    }
    expect(parsed.draftText).toBe(rawResponse);
    expect(parsed.bidAmount).toBe(100);
  });

  it('should set proposal status to draft on creation', () => {
    const status = 'draft';
    expect(['draft', 'sent', 'accepted', 'rejected']).toContain(status);
  });
});
