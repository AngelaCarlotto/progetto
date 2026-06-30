import { TestBed } from '@angular/core/testing';
import { DataService } from './data';

describe('DataService', () => {
  let service: DataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DataService]
    });
    service = TestBed.inject(DataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with empty arrays for all reactive state subjects', () => {
    expect(Array.isArray(service.scripts)).toBeTruthy();
    expect(Array.isArray(service.logs)).toBeTruthy();
    expect(Array.isArray(service.customers)).toBeTruthy();
    expect(Array.isArray(service.servers)).toBeTruthy();
    
    expect(service.scripts.length).toBe(0);
    expect(service.logs.length).toBe(0);
  });

  it('should update reactive state values and persist arrays through setters', () => {
    const mockScripts = [{ id: 'SCR-123456', path: '/var/backup' }];
    service.scripts = mockScripts;
    
    expect(service.scripts.length).toBe(1);
    expect(service.scripts[0].id).toBe('SCR-123456');
  });

  it('should fallback to an empty array if a non-array value is assigned to setters', () => {
    service.logs = null as any;
    
    expect(Array.isArray(service.logs)).toBeTruthy();
    expect(service.logs.length).toBe(0);
  });
});