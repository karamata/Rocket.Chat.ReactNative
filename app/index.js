import React from 'react';
import {
	createStackNavigator, createAppContainer, createSwitchNavigator, createDrawerNavigator
} from 'react-navigation';
import { Provider } from 'react-redux';
import { useScreens } from 'react-native-screens'; // eslint-disable-line import/no-unresolved
import { Linking } from 'react-native';
import firebase from 'react-native-firebase';
import PropTypes from 'prop-types';

import { appInit } from './actions';
import { deepLinkingOpen } from './actions/deepLinking';
import AuthLoadingView from './views/AuthLoadingView';
import RoomsListView from './views/RoomsListView';
import RoomView from './views/RoomView';
import NewMessageView from './views/NewMessageView';
import DirectoryView from './views/DirectoryView';
import Navigation from './lib/Navigation';
import Sidebar from './views/SidebarView';
import RoomActionsView from './views/RoomActionsView';
import RoomInfoView from './views/RoomInfoView';
import RoomInfoEditView from './views/RoomInfoEditView';
import RoomMembersView from './views/RoomMembersView';
import SearchMessagesView from './views/SearchMessagesView';
import ReadReceiptsView from './views/ReadReceiptView';
import ThreadMessagesView from './views/ThreadMessagesView';
import MessagesView from './views/MessagesView';
import AutoTranslateView from './views/AutoTranslateView';
import SelectedUsersView from './views/SelectedUsersView';
import CreateChannelView from './views/CreateChannelView';
import OAuthView from './views/OAuthView';
import LogoutView from './views/LogoutView';
import SetUsernameView from './views/SetUsernameView';
import { HEADER_BACKGROUND, HEADER_TITLE, HEADER_BACK } from './constants/colors';
import parseQuery from './lib/methods/helpers/parseQuery';
import { initializePushNotifications, onNotification } from './notifications/push';
import store from './lib/createStore';
import NotificationBadge from './notifications/inApp';

useScreens();

const parseDeepLinking = (url) => {
	if (url) {
		url = url.replace(/edchat:\/\/|https:\/\/chatdev.edinnova.com\//, '');
		const regex = /^(room|auth)\?/;
		if (url.match(regex)) {
			url = url.replace(regex, '').trim();
			if (url) {
				return parseQuery(url);
			}
		}
	}
	return null;
};

const defaultHeader = {
	headerStyle: {
		backgroundColor: HEADER_BACKGROUND
	},
	headerTitleStyle: {
		color: HEADER_TITLE
	},
	headerBackTitle: null,
	headerTintColor: HEADER_BACK
};

const OAuthStack = createStackNavigator({
	OAuthView
}, {
	defaultNavigationOptions: defaultHeader
});

const LogoutStack = createStackNavigator({
	LogoutView
}, {
	defaultNavigationOptions: defaultHeader
});

const ChatsStack = createStackNavigator({
	RoomsListView,
	RoomView,
	RoomActionsView,
	RoomInfoView,
	RoomInfoEditView,
	RoomMembersView,
	SearchMessagesView,
	SelectedUsersView,
	ThreadMessagesView,
	MessagesView,
	AutoTranslateView,
	ReadReceiptsView,
	DirectoryView
}, {
	defaultNavigationOptions: defaultHeader
});

ChatsStack.navigationOptions = ({ navigation }) => {
	let drawerLockMode = 'unlocked';
	if (navigation.state.index > 0) {
		drawerLockMode = 'locked-closed';
	}
	return {
		drawerLockMode
	};
};

const ChatsDrawer = createDrawerNavigator({
	ChatsStack
}, {
	contentComponent: Sidebar
});

const NewMessageStack = createStackNavigator({
	NewMessageView,
	SelectedUsersViewCreateChannel: SelectedUsersView,
	CreateChannelView
}, {
	defaultNavigationOptions: defaultHeader
});

const InsideStackModal = createStackNavigator({
	Main: ChatsDrawer,
	NewMessageStack
},
{
	mode: 'modal',
	headerMode: 'none'
});

const SetUsernameStack = createStackNavigator({
	SetUsernameView
});

class CustomInsideStack extends React.Component {
	static router = InsideStackModal.router;

	static propTypes = {
		navigation: PropTypes.object
	}

	render() {
		const { navigation } = this.props;
		return (
			<React.Fragment>
				<InsideStackModal navigation={navigation} />
				<NotificationBadge navigation={navigation} />
			</React.Fragment>
		);
	}
}

const App = createAppContainer(createSwitchNavigator(
	{
		OutsideStack: OAuthStack,
		LogoutStack,
		InsideStack: CustomInsideStack,
		AuthLoading: AuthLoadingView,
		SetUsernameStack
	},
	{
		initialRouteName: 'AuthLoading'
	}
));

// gets the current screen from navigation state
const getActiveRouteName = (navigationState) => {
	if (!navigationState) {
		return null;
	}
	const route = navigationState.routes[navigationState.index];
	// dive into nested navigators
	if (route.routes) {
		return getActiveRouteName(route);
	}
	return route.routeName;
};

const onNavigationStateChange = (prevState, currentState) => {
	const currentScreen = getActiveRouteName(currentState);
	const prevScreen = getActiveRouteName(prevState);

	if (prevScreen !== currentScreen) {
		firebase.analytics().setCurrentScreen(currentScreen);
	}
};

export default class Root extends React.Component {
	constructor(props) {
		super(props);
		this.init();
	}

	componentDidMount() {
		this.listenerTimeout = setTimeout(() => {
			Linking.addEventListener('url', ({ url }) => {
				const parsedDeepLinkingURL = parseDeepLinking(url);
				if (parsedDeepLinkingURL) {
					store.dispatch(deepLinkingOpen(parsedDeepLinkingURL));
				}
			});
		}, 5000);
	}

	componentWillUnmount() {
		clearTimeout(this.listenerTimeout);
	}

	init = async() => {
		const [notification, deepLinking] = await Promise.all([initializePushNotifications(), Linking.getInitialURL()]);
		const parsedDeepLinkingURL = parseDeepLinking(deepLinking);
		if (notification) {
			onNotification(notification);
		} else if (parsedDeepLinkingURL) {
			store.dispatch(deepLinkingOpen(parsedDeepLinkingURL));
		} else {
			store.dispatch(appInit());
		}
	}

	render() {
		return (
			<Provider store={store}>
				<App
					ref={(navigatorRef) => {
						Navigation.setTopLevelNavigator(navigatorRef);
					}}
					onNavigationStateChange={onNavigationStateChange}
				/>
			</Provider>
		);
	}
}
