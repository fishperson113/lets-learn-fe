import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterOutlet } from '@angular/router';
import { SharedComponentsModule } from '@shared/components/shared-components.module';
import { SharedModule } from '@shared/shared.module';
import { MeetingPageComponent } from './components/meeting-page/meeting-page.component';
import { TabMeetingComponent } from './components/meeting-page/meeting-tabs/tab-meeting/tab-meeting.component';
import { TabSettingComponent } from './components/meeting-page/meeting-tabs/tab-setting/tab-setting.component';
import { MeetingRichTextModule } from './meeting-rich-text.module';
import { TabHistoryComponent } from './components/meeting-page/meeting-tabs/tab-history/tab-history.component';

@NgModule({
  declarations: [
    MeetingPageComponent, 
    TabMeetingComponent, 
    TabMeetingComponent, 
    TabSettingComponent,
    TabHistoryComponent
  ],
  imports: [SharedModule, RouterOutlet, RouterLink, FormsModule, SharedComponentsModule, MeetingRichTextModule],
  exports: [],
})

export class MeetingModule {}