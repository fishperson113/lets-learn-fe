import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ROUTES } from '@shared/constants/routes';
import { GOOGLE_ICON_LINK } from '@shared/helper/google-icon.helper';
import { UserService } from '@shared/services/user.service';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  title = 'ng-lets-learn-fe';
  private lastNonAdminRoute: string = ROUTES.HOME;

  constructor(private userService: UserService, private router: Router) {}

  ngOnInit() {
    // Config for Google Material Icons
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = GOOGLE_ICON_LINK;
    document.head.appendChild(link);

    // Subscribe to user changes
    this.userService.user$.subscribe((user) => {
      // Use set timeout to ensure the router navigation happens after the current change detection cycle
      // This ensures that we can get correct current URL
      setTimeout(() => {
        const currentUrl = this.router.url;
        
        // Track last non-admin route for non-admin users
        if (user && user.role !== 'ADMIN' && 
            !currentUrl.startsWith('/admin') && 
            currentUrl !== ROUTES.LOGIN && 
            currentUrl !== ROUTES.SIGN_UP &&
            currentUrl !== '/') {
          this.lastNonAdminRoute = currentUrl;
        }

        // If user is not logged in, redirect to login page
        if (!user) {
          // Allow access to landing page, login and sign up without authentication
          if (
            currentUrl !== ROUTES.LOGIN &&
            currentUrl !== ROUTES.SIGN_UP &&
            currentUrl !== '/'
          ) {
            const tree = this.router.createUrlTree([ROUTES.LOGIN]);
            this.router.navigateByUrl(tree, { replaceUrl: true });
          }
        }
        // If user is logged in, redirect to home page if current URL is login or sign up
        else if (
          currentUrl === ROUTES.LOGIN ||
          currentUrl === ROUTES.SIGN_UP ||
          currentUrl === '/'
        ) {
          // Clear the url tree to avoid go back to the login page
          // Redirect admin users to admin page, others to home
          const targetRoute = user.role === 'ADMIN' ? ROUTES.ADMIN : ROUTES.HOME;
          const tree = this.router.createUrlTree([targetRoute]);
          this.router.navigateByUrl(tree, { replaceUrl: true });
        }
        // If admin user tries to access non-admin routes, redirect to admin page
        else if (
          user.role === 'ADMIN' &&
          !currentUrl.startsWith('/admin')
        ) {
          const tree = this.router.createUrlTree([ROUTES.ADMIN]);
          this.router.navigateByUrl(tree, { replaceUrl: true });
        }
        // If non-admin user tries to access admin route, redirect to last page
        else if (
          user.role !== 'ADMIN' &&
          currentUrl.startsWith('/admin')
        ) {
          const tree = this.router.createUrlTree([this.lastNonAdminRoute]);
          this.router.navigateByUrl(tree, { replaceUrl: true });
        }
      });
    });
  }
}