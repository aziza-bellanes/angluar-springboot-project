import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { authGuard } from './guards';
describe('authGuard',()=>{it('redirects unauthenticated visitors',()=>{
TestBed.configureTestingModule({providers:[provideRouter([]),{provide:AuthService,useValue:{isLoggedIn:false}}]});
const result=TestBed.runInInjectionContext(()=>authGuard({} as any,{} as any));expect(result.toString()).toContain('/login');
});});
