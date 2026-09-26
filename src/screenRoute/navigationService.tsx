import { CommonActions, StackActions, DrawerActions } from '@react-navigation/native';

let navigator: any;

function setTopLevelNavigator(navigatorRef: any) {
  navigator = navigatorRef;
}

function navigate(routeName: string, params?: object) {
  if (navigator) {
    navigator.dispatch(
      CommonActions.navigate({
        name: routeName,
        params: params,
      }),
    );
  }
}

function pop(n = 1) {
  if (navigator) {
    navigator.dispatch(
      StackActions.pop(n),
    );
  }
}

function push(routeName: string, params?: object) {
  if (navigator) {
    navigator.dispatch(StackActions.push(routeName, params));
  }
}

function reset(routeName: string) {
  if (navigator) {
    navigator.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: routeName }],
      }),
    );
  }
}

function goBack() {
  if (navigator) {
    navigator.dispatch(CommonActions.goBack());
  }
}

function openDrawer() {
  if (navigator) {
    navigator.dispatch(DrawerActions.openDrawer());
  }
}

function closeDrawer() {
  if (navigator) {
    navigator.dispatch(DrawerActions.closeDrawer());
  }
}

function replace(routeName: string, params?: object) {
  if (navigator) {
    navigator.dispatch(StackActions.replace(routeName, params));
  }
}

export default {
  goBack,
  navigate,
  setTopLevelNavigator,
  openDrawer,
  closeDrawer,
  pop,
  reset,
  push,
  replace,
};
