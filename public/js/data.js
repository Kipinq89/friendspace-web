/**
 * KipinQ — Data & State
 * Central store for all app data and state management.
 */

const AppState = {
  currentUser: {
    username: 'Guest',
    handle:   '',
    emoji:    '😎',
    bio:      '',
    mood:     '😊 Happy',
    tagline:  '',
    location: '',
    status:   '',
    zodiac:   '',
    band:     '',
    avatar:   '',
    profileSongTitle: '',
    profileSongArtist: '',
    profileSongUrl: '',
    joined:   '',
    stats:    { friends: 0, views: 0, posts: 0, groups: 0 },
    badges:   [],
    top8:     [],
  },

  posts: [],
  friends: [],
  friendRequests: [],
  conversations: {},
  activeConversation: null,
  tracks: [],
  photos: [],
  albums: [],

  playerState: {
    playing:  false,
    progress: 0,
    volume:   80,
    shuffle:  false,
    repeat:   false,
    currentTrackId: null,
    elapsed:  '0:00',
    total:    '0:00',
  },

  profileComments: [],
  groups: [],
  autoReplies: [],
};