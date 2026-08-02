import assert from 'node:assert/strict';
import test from 'node:test';
import { extractWorkzoomJobs } from '../engines/workzoom';

test('extracts stable Workzoom requisition links and removes duplicates', () => {
  assert.deepEqual(extractWorkzoomJobs([
    {
      title: 'County Planner',
      requisition: '408',
      url: 'https://curos.ca/curos/COR2302/V/TRBJO_PUBLIC?requisition_number=408&view=detail&lang=en',
      location: 'Pembroke Ontario, CAN',
    },
    {
      title: 'Duplicate',
      requisition: '408',
      url: 'https://curos.ca/duplicate',
    },
  ], 'https://curos.ca/curos/COR2302/V/TRBJO_PUBLIC'), [
    {
      id: '880e54e4d8e0',
      title: 'County Planner',
      url: 'https://curos.ca/curos/COR2302/V/TRBJO_PUBLIC?requisition_number=408&view=detail&lang=en',
      location: 'Pembroke Ontario, CAN',
    },
  ]);
});
