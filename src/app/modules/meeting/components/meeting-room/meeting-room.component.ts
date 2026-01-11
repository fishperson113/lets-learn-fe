import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { LiveKitService, LiveKitConnectionState } from '../../services/livekit.service';
import { RemoteParticipant, RemoteTrack, RemoteTrackPublication, Track } from 'livekit-client';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GetMeetingToken } from '../../api/meeting.api';
import { WhiteboardComponent } from '../whiteboard/whiteboard.component';
import { PollCreateComponent, PollData } from '../poll/poll-create/poll-create.component';
import { PollVoteComponent } from '../poll/poll-vote/poll-vote.component';
import { PollResultComponent } from '../poll/poll-result/poll-result.component';

@Component({
  selector: 'app-meeting-room',
  standalone: true,
  imports: [CommonModule, FormsModule, WhiteboardComponent, PollCreateComponent, PollVoteComponent, PollResultComponent],
  templateUrl: './meeting-room.component.html',
  styleUrls: ['./meeting-room-livekit.component.scss'],
  providers: [LiveKitService],
})
export class MeetingRoomComponent implements OnInit, OnDestroy {
  @ViewChild('localVideo') localVideoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('localAudio') localAudioElement!: ElementRef<HTMLAudioElement>;
  @ViewChild('whiteboard') whiteboardComponent!: WhiteboardComponent;
  @ViewChild('chatMessagesContainer') chatMessagesContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('screenShareVideo') screenShareVideoElement!: ElementRef<HTMLVideoElement>;

  connectionState: LiveKitConnectionState = {
    isConnecting: false,
    isConnected: false,
    error: null,
    room: null,
    localParticipant: null,
    remoteParticipants: [],
  };

  token: string = '';
  roomName: string = '';
  isVideoEnabled: boolean = true;
  isAudioEnabled: boolean = true;
  isScreenSharing: boolean = false;
  isLoadingToken: boolean = true;
  showWhiteboard: boolean = false;
  currentUserIdentity: string = 'You';
  showReactionPicker: boolean = false;
  reactions: Array<{ emoji: string; x: number; y: number; id: string; senderId: string }> = [];
  currentTime: string = '';
  speakingParticipants: Set<string> = new Set();
  isLocalSpeaking: boolean = false;
  showMeetingDetails: boolean = false;
  showParticipants: boolean = false;
  showChat: boolean = false;
  isHandRaised: boolean = false;
  raisedHands: Set<string> = new Set();
  chatMessages: Array<{ text: string; senderId: string; senderName: string; timestamp: Date }> = [];
  chatInputText: string = '';
  activeScreenShare: { participantId: string; participantName: string } | null = null;
  remoteScreenShares: Array<{ participantId: string; participantName: string }> = [];

  // Poll State
  showPolls: boolean = false;
  pollState: 'idle' | 'active' | 'ended' = 'idle';
  currentPoll: PollData | null = null;
  pollResults: { [optionId: string]: number } = {};
  pollTextResponses: string[] = [];
  pollVotes: Array<{
    studentId: string;
    studentName: string;
    answer: string; // id or text
    rawAnswer?: string; // For display/logic if needed
    timestamp: string;
  }> = [];
  totalPollVotes: number = 0;
  hasVoted: boolean = false;
  isPollCreator: boolean = false;



  userRole: 'teacher' | 'student' = 'student';
  currentUserAvatar: string = '';
  currentUserName: string = '';

  getCurrentUserAvatar(): string {
    if (this.currentUserAvatar) return this.currentUserAvatar;
    return `https://ui-avatars.com/api/?name=${this.getInitial(this.currentUserName || 'You')}&background=607D8B&color=FFFFFF&size=40`;
  }


  private destroy$ = new Subject<void>();
  remoteParticipantElements: Map<string, { video?: HTMLVideoElement; audio?: HTMLAudioElement }> = new Map();
  
  // Attendance History
  attendanceRecords: Map<string, {
    name: string;
    firstJoinTime: number;
    lastLeaveTime?: number;
    sessions: { start: number; end?: number }[];
    status: 'Active' | 'Left';
  }> = new Map();

  private topicId: string | null = null;
  private courseId: string | null = null;

  constructor(
    private liveKitService: LiveKitService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    // Initialize current time
    this.updateCurrentTime();
    setInterval(() => this.updateCurrentTime(), 1000);

    // Get route parameters
    this.topicId = this.route.snapshot.paramMap.get('topicId');
    
    // Get courseId from query params
    this.courseId = this.route.snapshot.queryParamMap.get('courseId');

    console.log('Meeting Room Init - TopicId:', this.topicId, 'CourseId:', this.courseId);

    // Attempt to auto-fetch token from backend
    await this.fetchTokenFromBackend();

    // Subscribe to connection state changes
    this.liveKitService.connectionState$
      .pipe(takeUntil(this.destroy$))
      .subscribe((state) => {
        this.connectionState = state;
        
        // Attach local tracks when connected
        if (state.isConnected && state.localParticipant) {
          this.currentUserIdentity = state.localParticipant.identity;
          this.trackParticipantJoin(state.localParticipant.identity, this.currentUserName || 'You (Host)');
          setTimeout(() => {
            this.attachLocalTracks();
            this.updateDeviceStates();
            this.checkForScreenShare();
          }, 500);
        }
      });

    // Listen for remote participant events
    this.liveKitService.participantConnected$
      .pipe(takeUntil(this.destroy$))
      .subscribe((participant) => {
        this.handleRemoteParticipant(participant);
        this.trackParticipantJoin(participant.identity, participant.name || participant.identity);
      });

    this.liveKitService.participantDisconnected$
      .pipe(takeUntil(this.destroy$))
      .subscribe((participant) => {
        this.remoteParticipantElements.delete(participant.identity);
        this.trackParticipantLeave(participant.identity);
      });

    // Listen for data messages (whiteboard actions)
    this.liveKitService.dataReceived$
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ data, senderId }) => {
        console.log('Received data from', senderId, data);
        if (data.type === 'whiteboard') {
          this.handleWhiteboardAction(data);
        } else if (data.type === 'reaction') {
          this.handleReceivedReaction(data, senderId);
        } else if (data.type === 'raiseHand') {
          this.handleRaiseHand(data, senderId);
        } else if (data.type === 'chat') {
          this.handleChatMessage(data, senderId);
        } else if (data.type.startsWith('poll-')) {
          this.handlePollAction(data, senderId);
        }
      });

    // Setup speaking detection for local participant
    this.setupSpeakingDetection();
  }

  private setupSpeakingDetection(): void {
    // Check speaking status periodically
    setInterval(() => {
      if (this.connectionState.localParticipant) {
        this.isLocalSpeaking = this.connectionState.localParticipant.isSpeaking;
      }

      // Update remote participants speaking status
      this.connectionState.remoteParticipants.forEach(participant => {
        if (participant.isSpeaking) {
          this.speakingParticipants.add(participant.identity);
        } else {
          this.speakingParticipants.delete(participant.identity);
        }
      });
    }, 100);
  }

  async fetchTokenFromBackend(): Promise<void> {
    if (!this.topicId || !this.courseId) {
      console.error('Missing topicId or courseId');
      this.connectionState.error = 'Invalid meeting link. Missing required parameters.';
      this.isLoadingToken = false;
      return;
    }

    try {
      this.isLoadingToken = true;
      const response = await GetMeetingToken(this.topicId, this.courseId);
      
      this.token = response.token;
      this.roomName = response.roomName;
      this.userRole = (response.role === 'teacher') ? 'teacher' : 'student';
      this.currentUserAvatar = response.avatarUrl || '';
      this.currentUserName = response.name || 'User';
      this.currentUserName = response.name || 'User';
      // this.currentUserIdentity will be set from LiveKit connection

      
      // Auto-join with fetched token
      await this.joinRoom();
    } catch (error) {
      console.error('Failed to fetch token from backend:', error);
      this.connectionState.error = 'Failed to connect to meeting. Please try again later.';
    } finally {
      this.isLoadingToken = false;
    }
  }

  async joinRoom(): Promise<void> {
    if (!this.token.trim()) {
      this.connectionState.error = 'Invalid token. Please try again.';
      return;
    }

    try {
      await this.liveKitService.connect(this.token, this.roomName);
    } catch (error) {
      console.error('Failed to join room:', error);
      this.connectionState.error = 'Failed to join room. Please check your connection.';
    }
  }

  async leaveRoom(): Promise<void> {
    console.log('=== LEAVE ROOM DEBUG ===');
    console.log('Current URL:', this.router.url);
    console.log('CourseId:', this.courseId);
    console.log('TopicId:', this.topicId);

    // 1. Disconnect immediately to stop AV/WebRTC
    try {
      await this.liveKitService.disconnect();
    } catch (error) {
       console.error('Failed to disconnect LiveKit:', error);
    }

    // 2. Save history if teacher
    if (this.userRole === 'teacher' && this.topicId && this.courseId) {
       try {
         // Determine start time - use attendance record of current user (teacher)
         const myAttendance = this.attendanceRecords.get(this.currentUserIdentity);
         const startTime = myAttendance ? new Date(myAttendance.firstJoinTime).toISOString() : new Date().toISOString();
         const endTime = new Date().toISOString();
         const attendeeCount = this.attendanceRecords.size;

         // Generate and upload attendance CSV
         let csvUrl = '';
         try {
           const csvContent = this.generateAttendanceCsv();
           const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
           const filename = `attendance_${this.courseId}_${this.topicId}_${timestamp}.csv`;
           const file = new File([csvContent], filename, { type: 'text/csv' });
           
           const uploadResult = await import('../../../../shared/api/cloudinary.api').then(api => 
             api.UploadCloudinaryFile(file)
           );
           
           if (uploadResult && uploadResult.secure_url) {
             csvUrl = uploadResult.secure_url;
             console.log('Attendance CSV uploaded:', csvUrl);
           }
         } catch (uploadErr) {
           console.error('Failed to upload attendance CSV', uploadErr);
         }

         await import('../../api/meeting.api').then(api => 
           api.SaveMeetingHistory(this.topicId!, this.courseId!, {
             startTime,
             endTime,
             attendeeCount,
             attendanceCsvUrl: csvUrl
           })
         );
         console.log('Meeting history saved');
       } catch (err) {
         console.error('Failed to save meeting history', err);
       }
    }
    
    // 3. Navigate back to meeting page  
    if (this.courseId && this.topicId) {
      // Correct route structure: /courses/:courseId/meeting/:topicId (NO 'topic' segment!)
      const targetRoute = ['/courses', this.courseId, 'meeting', this.topicId];
      console.log('Navigating to:', targetRoute.join('/'));
      
      try {
        const result = await this.router.navigate(targetRoute);
        console.log('Navigation result:', result);
        
        if (!result) {
          console.error('Navigation failed! Falling back to browser history.');
          window.history.back();
        }
      } catch (error) {
        console.error('Navigation error:', error);
        window.history.back();
      }
    } else {
      console.warn('Missing courseId or topicId, falling back to browser history');
      console.log('Available data - CourseId:', this.courseId, 'TopicId:', this.topicId);
      window.history.back();
    }
    
    console.log('=== END LEAVE ROOM DEBUG ===');
  }

  async toggleVideo(): Promise<void> {
    const newState = !this.isVideoEnabled;
    const success = await this.liveKitService.toggleVideo(newState);
    
    if (success) {
      this.isVideoEnabled = newState;
    } else {
      console.warn('Failed to toggle video, keeping current state');
      // Show user-friendly message
      if (newState) {
        alert('Unable to access camera. Please check your camera permissions and try again.');
      }
    }
  }

  async toggleAudio(): Promise<void> {
    const newState = !this.isAudioEnabled;
    const success = await this.liveKitService.toggleAudio(newState);
    
    if (success) {
      this.isAudioEnabled = newState;
    } else {
      console.warn('Failed to toggle audio, keeping current state');
      // Show user-friendly message
      if (newState) {
        alert('Unable to access microphone. Please check your microphone permissions and try again.');
      }
    }
  }

  async toggleScreenShare(): Promise<void> {
    const newState = !this.isScreenSharing;
    const success = await this.liveKitService.toggleScreenShare(newState);
    
    if (success) {
      this.isScreenSharing = newState;
      // Wait a bit for track to be published, then check for screen share
      setTimeout(() => {
        this.checkForScreenShare();
      }, 500);
    } else {
      console.warn('Failed to toggle screen share, keeping current state');
      if (newState) {
        alert('Unable to share screen. Screen sharing may have been cancelled or is not supported.');
      }
    }
  }

  toggleWhiteboard(): void {
    this.showWhiteboard = !this.showWhiteboard;
  }

  toggleReactionPicker(): void {
    this.showReactionPicker = !this.showReactionPicker;
  }

  toggleMeetingDetails(): void {
    this.showMeetingDetails = !this.showMeetingDetails;
    if (this.showMeetingDetails) {
      this.showParticipants = false;
      this.showChat = false;
      this.showPolls = false;
    }
  }

  toggleParticipants(): void {
    this.showParticipants = !this.showParticipants;
    if (this.showParticipants) {
      this.showMeetingDetails = false;
      this.showChat = false;
      this.showPolls = false;
    }
  }

  toggleChat(): void {
    this.showChat = !this.showChat;
    if (this.showChat) {
      this.showMeetingDetails = false;
      this.showParticipants = false;
      this.showPolls = false;
    }
  }

  togglePolls(): void {
    this.showPolls = !this.showPolls;
    if (this.showPolls) {
      this.showMeetingDetails = false;
      this.showParticipants = false;
      this.showChat = false;
    }
  }

  // Poll Methods
  handleCreatePoll(pollData: PollData): void {
    if (this.userRole !== 'teacher') {
      console.warn('Unauthorized: Only teachers can create polls');
      return;
    }

    this.currentPoll = pollData;
    this.pollState = 'active';
    this.pollResults = {};
    this.pollTextResponses = [];
    this.totalPollVotes = 0;
    this.hasVoted = false;
    this.isPollCreator = true;
    
    // Initialize results count
    if (pollData.type !== 'Short Answer') {
        pollData.options.forEach(opt => this.pollResults[opt.id] = 0);
    }
    this.pollVotes = []; // Reset votes for new poll

    // Broadcast start
    this.liveKitService.sendData({
      type: 'poll-start',
      poll: pollData,
      creatorId: this.currentUserIdentity
    });
  }

  handleSubmitVote(optionIds: string[]): void {
    this.hasVoted = true;

    // Send vote to host/all
    this.liveKitService.sendData({
      type: 'poll-vote',
      optionIds: optionIds,
      voterId: this.currentUserIdentity
    });

    this.processVote(optionIds, this.currentUserIdentity, new Date().toISOString());
  }

  handleEndPoll(): void {
    if (this.userRole !== 'teacher' && !this.isPollCreator) return;
    
    this.pollState = 'ended';
    
    this.liveKitService.sendData({
      type: 'poll-end',
      pollId: 'current'
    });
  }

  handleResetPoll(): void {
    if (this.userRole !== 'teacher') return;
    
    this.pollState = 'idle';
    this.currentPoll = null;
    this.pollState = 'idle';
    this.currentPoll = null;
    this.pollResults = {};
    this.pollTextResponses = [];
    this.pollVotes = [];
    this.totalPollVotes = 0;
    this.hasVoted = false;
    this.isPollCreator = false;
  }

  private handlePollAction(data: any, senderId: string): void {
    switch (data.type) {
      case 'poll-start':
        this.currentPoll = data.poll;
        this.pollState = 'active';
        this.pollResults = {};
        this.pollTextResponses = [];
        this.totalPollVotes = 0;
        this.hasVoted = false;
        this.isPollCreator = (senderId === this.currentUserIdentity);
        this.showPolls = true; 
        
        if (this.currentPoll) {
             if (this.currentPoll.type !== 'Short Answer') {
                this.currentPoll.options.forEach(opt => this.pollResults[opt.id] = 0);
             }
             this.pollVotes = []; // Reset if we missed the start? Or handle re-join logic ideally
        }
        break;
        
      case 'poll-vote':
        this.processVote(data.optionIds, senderId, new Date().toISOString()); // senderId from data channel
        break;
        
      case 'poll-end':
        this.pollState = 'ended';
        this.showPolls = true;
        break;
    }
  }

  private processVote(optionIds: string[], senderId: string, timestamp: string): void {
    if (!this.currentPoll) return;
    
    const studentName = this.getParticipantDisplayName(senderId);
    let capturedAnswer = '';
    let answerNormalized = '';

    if (this.currentPoll.type === 'Short Answer') {
        if (optionIds && optionIds.length > 0) {
            capturedAnswer = optionIds[0];
            answerNormalized = capturedAnswer.trim().toLowerCase();
            this.pollTextResponses.push(capturedAnswer);
            this.totalPollVotes++;
        }
    } else {
        optionIds.forEach(id => {
            if (this.pollResults[id] !== undefined) {
                this.pollResults[id]++;
                this.totalPollVotes++;
                // For MC/TF, usually we store ID, but for CSV we might want the text value?
                // Or store ID and lookup later. Storing ID for now.
                capturedAnswer = id;
                
                // For normalized:
                if (this.currentPoll?.type === 'True/False') {
                    answerNormalized = id.toLowerCase(); // 'true' or 'false'
                } else {
                     // Multiple Choice: Map ID to A/B/C? or just keep ID?
                     // Plan said: A, B, C based on index
                     const idx = this.currentPoll?.options.findIndex(o => o.id === id) ?? -1;
                     if (idx !== -1) {
                         answerNormalized = String.fromCharCode(65 + idx); // 0->A, 1->B
                     }
                }
            }
        });
    }

    if (capturedAnswer) {
        this.pollVotes.push({
            studentId: senderId,
            studentName: studentName,
            answer: capturedAnswer,
            rawAnswer: capturedAnswer, // duplication for now, simplified
            timestamp: timestamp
        });
    }
  }

  exportPollResults(): void {
      if (!this.currentPoll || this.pollVotes.length === 0) {
          alert("No votes to export.");
          return;
      }

      const headers = [
          "meeting_id", "meeting_name", "poll_id", "poll_question", "poll_type",
          "student_id", "student_name", "answer", "answer_normalized", "is_correct", "answered_at"
      ];
      const rows = [headers.join(",")];

      const meetingId = this.topicId || 'unknown-meeting-id'; // using topicId as meeting_id
      const pollId = 'poll-' + Date.now(); // Mock ID, real one not available in FE model efficiently

      this.pollVotes.forEach(vote => {
          // Resolve Answer Text for MC/TF because 'vote.answer' might be an ID
          let displayAnswer = vote.answer;
          let answerNormalized = ''; 

          if (this.currentPoll?.type !== 'Short Answer') {
             const option = this.currentPoll?.options.find(o => o.id === vote.answer);
             if (option) {
                 displayAnswer = option.text;
             }
             
             if (this.currentPoll?.type === 'True/False') {
                 answerNormalized = displayAnswer.toLowerCase();
             } else {
                 // Multiple Choice -> A, B, C
                 const idx = this.currentPoll?.options.findIndex(o => o.id === vote.answer) ?? -1;
                 if (idx !== -1) {
                     answerNormalized = String.fromCharCode(65 + idx);
                 }
             }
          } else {
              // Short Answer
              answerNormalized = vote.answer.trim().toLowerCase();
          }
          
          // Escape CSV fields
          const safe = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;

          const row = [
              safe(meetingId),
              safe(this.roomName),
              safe(pollId),
              safe(this.currentPoll?.question || ''),
              safe(this.currentPoll?.type || ''),
              safe(vote.studentId),
              safe(vote.studentName),
              safe(displayAnswer),
              safe(answerNormalized),
              '', // is_correct (not implemented)
              safe(vote.timestamp)
          ];
          rows.push(row.join(","));
      });

      const csvContent = rows.join("\n");
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `poll_results_${meetingId}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  }

  sendReaction(emoji: string): void {
    const reaction = {
      type: 'reaction',
      emoji: emoji,
      timestamp: Date.now(),
      senderId: this.currentUserIdentity
    };

    // Send to all participants
    this.liveKitService.sendData(reaction);

    // Show locally
    this.displayReaction(emoji, this.currentUserIdentity);

    // Keep picker open for spam reactions
  }

  toggleRaiseHand(): void {
    this.isHandRaised = !this.isHandRaised;

    // Broadcast hand status to all participants
    const handStatus = {
      type: 'raiseHand',
      isRaised: this.isHandRaised,
      timestamp: Date.now(),
      senderId: this.currentUserIdentity
    };

    this.liveKitService.sendData(handStatus);

    // Update local raised hands set
    if (this.isHandRaised) {
      this.raisedHands.add(this.currentUserIdentity);
    } else {
      this.raisedHands.delete(this.currentUserIdentity);
    }
  }

  sendChatMessage(): void {
    if (!this.chatInputText.trim()) return;

    const message = {
      type: 'chat',
      text: this.chatInputText.trim(),
      senderName: this.getParticipantDisplayName(this.currentUserIdentity),
      timestamp: new Date(),
      senderId: this.currentUserIdentity
    };

    // Broadcast to all participants
    this.liveKitService.sendData(message);

    // Add to local messages
    this.chatMessages.push({
      text: message.text,
      senderId: this.currentUserIdentity,
      senderName: 'You',
      timestamp: message.timestamp
    });

    // Clear input
    this.chatInputText = '';

    // Scroll to bottom
    this.scrollChatToBottom();
  }

  private handleReceivedReaction(data: any, senderId: string): void {
    if (data.emoji) {
      this.displayReaction(data.emoji, senderId);
    }
  }

  private handleRaiseHand(data: any, senderId: string): void {
    if (data.isRaised) {
      this.raisedHands.add(senderId);
    } else {
      this.raisedHands.delete(senderId);
    }
  }

  private handleChatMessage(data: any, senderId: string): void {
    this.chatMessages.push({
      text: data.text,
      senderId: senderId,
      senderName: data.senderName || this.getParticipantDisplayName(senderId),
      timestamp: new Date(data.timestamp)
    });

    // Scroll to bottom
    this.scrollChatToBottom();
  }

  private displayReaction(emoji: string, senderId: string): void {
    // Generate random position in the upper portion of the screen
    const x = Math.random() * 80 + 10; // 10% to 90% from left
    const y = Math.random() * 30 + 10; // 10% to 40% from top

    const reactionId = `${Date.now()}-${Math.random()}`;
    
    this.reactions.push({
      emoji,
      x,
      y,
      id: reactionId,
      senderId
    });

    // Remove reaction after animation completes (3 seconds)
    setTimeout(() => {
      this.reactions = this.reactions.filter(r => r.id !== reactionId);
    }, 3000);
  }

  private updateCurrentTime(): void {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    this.currentTime = `${hours}:${minutes}`;
  }

  private updateDeviceStates(): void {
    if (!this.connectionState.localParticipant) return;

    // Check if camera track exists and is enabled
    const videoTrack = Array.from(
      this.connectionState.localParticipant.videoTrackPublications.values()
    ).find(pub => pub.track?.kind === Track.Kind.Video);

    // Check if audio track exists and is enabled
    const audioTrack = Array.from(
      this.connectionState.localParticipant.audioTrackPublications.values()
    ).find(pub => pub.track?.kind === Track.Kind.Audio);

    this.isVideoEnabled = videoTrack?.track ? !videoTrack.track.isMuted : false;
    this.isAudioEnabled = audioTrack?.track ? !audioTrack.track.isMuted : false;

    console.log('Device states updated - Video:', this.isVideoEnabled, 'Audio:', this.isAudioEnabled);
  }

  onWhiteboardAction(action: any): void {
    console.log('Local whiteboard action:', action);
    // Send action to all participants via data channel
    this.liveKitService.sendData({
      type: 'whiteboard',
      action: action
    });
  }

  private handleWhiteboardAction(data: any): void {
    if (data.type === 'whiteboard' && this.whiteboardComponent) {
      // Apply the remote action to local whiteboard
      this.whiteboardComponent.handleRemoteAction(data.action);
    }
  }

  private attachLocalTracks(): void {
    if (!this.connectionState.localParticipant) return;

    // Get video track
    const videoPublication = Array.from(
      this.connectionState.localParticipant.videoTrackPublications.values()
    ).find(pub => pub.track?.kind === Track.Kind.Video);

    // Get audio track
    const audioPublication = Array.from(
      this.connectionState.localParticipant.audioTrackPublications.values()
    ).find(pub => pub.track?.kind === Track.Kind.Audio);

    if (videoPublication?.track && this.localVideoElement) {
      videoPublication.track.attach(this.localVideoElement.nativeElement);
      console.log('Local video track attached');
    }

    if (audioPublication?.track && this.localAudioElement) {
      audioPublication.track.attach(this.localAudioElement.nativeElement);
      console.log('Local audio track attached');
    }

    // Listen for track published/unpublished events (for screen share)
    this.connectionState.localParticipant.on('trackPublished', (publication) => {
      console.log('Local track published:', publication.source);
      if (publication.source === Track.Source.ScreenShare) {
        setTimeout(() => this.checkForScreenShare(), 300);
      }
    });

    this.connectionState.localParticipant.on('trackUnpublished', (publication) => {
      console.log('Local track unpublished:', publication.source);
      if (publication.source === Track.Source.ScreenShare) {
        setTimeout(() => this.checkForScreenShare(), 300);
      }
    });
  }

  private handleRemoteParticipant(participant: RemoteParticipant): void {
    participant.trackPublications.forEach((publication: RemoteTrackPublication) => {
      if (publication.track) {
        this.attachRemoteTrack(publication.track, participant);
      }
    });

    participant.on('trackSubscribed', (track: RemoteTrack) => {
      this.attachRemoteTrack(track, participant);
      // Check if it's a screen share track
      if (track.source === Track.Source.ScreenShare) {
        this.checkForScreenShare();
      }
    });

    participant.on('trackUnsubscribed', (track: RemoteTrack) => {
      // Check if screen share was stopped
      if (track.source === Track.Source.ScreenShare) {
        this.checkForScreenShare();
      }
    });
  }

  private attachRemoteTrack(track: RemoteTrack, participant: RemoteParticipant): void {
    setTimeout(() => {
      // Handle screen share tracks
      if (track.source === Track.Source.ScreenShare) {
        if (this.screenShareVideoElement?.nativeElement) {
          track.attach(this.screenShareVideoElement.nativeElement);
          this.activeScreenShare = {
            participantId: participant.identity,
            participantName: this.getParticipantDisplayName(participant.identity)
          };
        }
        return;
      }

      if (track.kind === Track.Kind.Video) {
        const videoElement = document.getElementById(`remote-video-${participant.identity}`) as HTMLVideoElement;
        if (videoElement) {
          track.attach(videoElement);
        }
      } else if (track.kind === Track.Kind.Audio) {
        const audioElement = document.getElementById(`remote-audio-${participant.identity}`) as HTMLAudioElement;
        if (audioElement) {
          track.attach(audioElement);
        }
      }
    }, 100);
  }

  getParticipantDisplayName(identity: string): string {
    if (identity === this.currentUserIdentity) {
      return this.currentUserName || 'You';
    }
    const participant = this.connectionState.remoteParticipants.find(p => p.identity === identity);
    return participant?.name || identity || 'Anonymous';
  }

  getInitial(name: string): string {
    if (!name) return 'A';
    return name.charAt(0).toUpperCase();
  }

  isParticipantVideoEnabled(participant: RemoteParticipant): boolean {
    const videoPublication = Array.from(participant.videoTrackPublications.values())
      .find(pub => pub.track?.kind === Track.Kind.Video);
    
    return videoPublication?.track ? !videoPublication.track.isMuted : false;
  }

  isParticipantSpeaking(participantIdentity: string): boolean {
    return this.speakingParticipants.has(participantIdentity);
  }

  getParticipantMetadata(participant: RemoteParticipant | any): { role: string; avatarUrl: string } {
    try {
      if (participant === 'local') {
          return { role: this.userRole, avatarUrl: this.currentUserAvatar };
      }
      if (participant && participant.metadata) {
        return JSON.parse(participant.metadata);
      }
    } catch (e) {
      console.error('Failed to parse participant metadata', e);
    }
    return { role: 'student', avatarUrl: '' }; // Default
  }

  isHost(participant: RemoteParticipant | any): boolean {
    if (participant === 'local') {
        return this.userRole === 'teacher';
    }
    const meta = this.getParticipantMetadata(participant);
    return meta.role === 'teacher';
  }

  getParticipantAvatar(participant: RemoteParticipant): string {
      const meta = this.getParticipantMetadata(participant);
      return meta.avatarUrl || '';
  }

  isHandRaisedFor(identity: string): boolean {
    return this.raisedHands.has(identity);
  }

  private generateAttendanceCsv(): string {
    const headers = ["Name,First Join Time,Last Leave Time,Status,Total Duration (min)"];
    const rows: string[] = [...headers];
    const now = Date.now();

    this.attendanceRecords.forEach(record => {
      // Calculate total duration
      let totalDurationMs = 0;
      record.sessions.forEach(session => {
        const end = session.end || (record.status === 'Active' ? now : session.start);
        totalDurationMs += (end - session.start);
      });
      
      const durationMin = (totalDurationMs / 60000).toFixed(1);
      const joinTime = new Date(record.firstJoinTime).toLocaleTimeString();
      const leaveTime = record.lastLeaveTime ? new Date(record.lastLeaveTime).toLocaleTimeString() : '-';
      
      rows.push(`${record.name},${joinTime},${leaveTime},${record.status},${durationMin}`);
    });

    return rows.join('\n');
  }

  // Attendance Tracking Helpers
  private trackParticipantJoin(identity: string, name: string): void {
    const now = Date.now();
    
    if (!this.attendanceRecords.has(identity)) {
      this.attendanceRecords.set(identity, {
        name,
        firstJoinTime: now,
        sessions: [{ start: now }],
        status: 'Active'
      });
    } else {
        const record = this.attendanceRecords.get(identity)!;
        record.status = 'Active';
        record.sessions.push({ start: now });
        // Update name if changed? Keep original for now or update.
    }
  }

  private trackParticipantLeave(identity: string): void {
    const now = Date.now();
    const record = this.attendanceRecords.get(identity);
    
    if (record) {
      record.status = 'Left';
      record.lastLeaveTime = now;
      // Close last session
      const lastSession = record.sessions[record.sessions.length - 1];
      if (lastSession && !lastSession.end) {
        lastSession.end = now;
      }
    }
  }

  exportAttendance(): void {
    const csvContent = this.generateAttendanceCsv();
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance-full-${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private scrollChatToBottom(): void {
    setTimeout(() => {
      if (this.chatMessagesContainer?.nativeElement) {
        this.chatMessagesContainer.nativeElement.scrollTop = 
          this.chatMessagesContainer.nativeElement.scrollHeight;
      }
    }, 100);
  }

  private checkForScreenShare(): void {
    console.log('Checking for screen share...');
    
    // Clear remote screen shares
    this.remoteScreenShares = [];
    
    // Check local participant for screen share - it's already handled by isScreenSharing
    // We just need to attach the track when it becomes available
    if (this.connectionState.localParticipant && this.isScreenSharing) {
      const screenTrack = Array.from(
        this.connectionState.localParticipant.videoTrackPublications.values()
      ).find(pub => pub.source === Track.Source.ScreenShare);

      console.log('Local screen share track:', screenTrack);

      if (screenTrack?.track) {
        console.log('Found local screen share track, attaching...');
        
        // Wait for the video element to be available in the DOM
        setTimeout(() => {
          if (this.screenShareVideoElement?.nativeElement && screenTrack.track) {
            screenTrack.track.attach(this.screenShareVideoElement.nativeElement);
            console.log('Local screen share attached to video element');
          } else {
            console.error('Screen share video element not found!');
          }
        }, 100);
      }
    }

    // Check remote participants for screen share
    for (const participant of this.connectionState.remoteParticipants) {
      const screenTrack = Array.from(
        participant.videoTrackPublications.values()
      ).find(pub => pub.source === Track.Source.ScreenShare);

      console.log(`Remote participant ${participant.identity} screen share track:`, screenTrack);

      if (screenTrack?.track) {
        console.log(`Found screen share from ${participant.identity}, adding to list...`);
        
        // Add to remote screen shares list
        this.remoteScreenShares.push({
          participantId: participant.identity,
          participantName: this.getParticipantDisplayName(participant.identity)
        });

        // Wait for the video element to be available in the DOM
        setTimeout(() => {
          const videoElement = document.getElementById(`screen-share-${participant.identity}`) as HTMLVideoElement;
          if (videoElement && screenTrack.track) {
            screenTrack.track.attach(videoElement);
            console.log('Remote screen share attached to video element');
          } else {
            console.error('Screen share video element not found for:', participant.identity);
          }
        }, 100);
      }
    }

    console.log('Remote screen shares:', this.remoteScreenShares);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.liveKitService.disconnect();
  }
}
