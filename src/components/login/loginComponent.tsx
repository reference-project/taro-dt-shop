import { ComponentClass } from 'react';
import Taro, { Component } from '@tarojs/taro';
import { connect } from '@tarojs/redux';
import { View, Text, Image, Button, Form } from '@tarojs/components';
import { AtModal, AtModalHeader, AtModalContent, AtModalAction } from 'taro-ui';
import './loginComponent.scss';
import wxImg from '../../static/images/wx.png';
import nbImg from '../../static/images/nb.jpg';

interface PageState {}
interface PageDva {
  dispatch: Function;
}

interface PageStateProps {
  // 自己要用的
  userInfoLoading: boolean;
  loginLoading: boolean;
  formIdArr: any[];
  userInfo: any;
}

interface PageOwnProps {
  //父组件要传
  show: boolean;
  onChange?: Function;
}

type IProps = PageState & PageOwnProps & PageDva & PageStateProps;
@connect(({ common, loading, cart, neighbor }) => ({
  ...common,
  ...cart,
  neighbor,
  userInfoLoading: loading.effects['common/getUserInfo'],
  loginLoading: loading.effects['common/login'],
}))
class Login extends Component<IProps, {}> {
  componentDidMount() {
    Taro.eventCenter.on('login', status => {
      if (typeof status !== 'boolean') {
        this.setState({
          shopPlanId: status.shopPlanId,
          next: status.next,
        });
      }
      this.setState({
        openLogin: !!status,
      });
    });
  }
  componentWillUnmount() {
    Taro.eventCenter.trigger('login', false);
  }
  componentDidHide() {
    Taro.eventCenter.trigger('login', false);
  }
  componentWillReceiveProps(props) {
    this.setState({
      openLogin: props.show,
    });
  }

  loginFun = async event => {
    if (event.detail.errMsg !== 'getUserInfo:ok') return;
    const userInfo = await this.props.dispatch({
      type: 'common/getUserInfo',
    });
    const code = await this.props.dispatch({
      type: 'common/wxCode',
    });
    if (!userInfo) {
      Taro.showToast({
        title: '登录失败，请重试',
        icon: 'none',
      });
      return;
    } else {
      await this.props.dispatch({
        type: 'common/login',
        payload: {
          code,
          userInfo,
        },
      });

      if (this.props.userInfo && this.props.userInfo.communityId) {
      } else {
        if (!this.state.shopPlanId) {
          const communityId = Taro.getStorageSync('communityId');
          if (communityId) {
            Taro.removeStorageSync('communityId');
            // 没有绑定过小区的  自动绑定
            await this.bindCommunity(communityId);
          } else {
            Taro.navigateTo({ url: '/pages/neighbor/search' });
            return;
          }
        }
      }

      await this.props.dispatch({
        type: 'cart/Index',
      });
      this.setState({
        openLogin: false,
      });
      if (this.props.onChange) this.props.onChange(userInfo, this.state.next);
    }
  };

  async bindCommunity(communityId) {
    await this.props.dispatch({
      type: 'neighbor/BindId',
      payload: {
        id: communityId,
      },
    });
    await this.props.dispatch({
      type: 'common/UserInfo',
    });
  }

  getFormId = e => {
    const formId = e.detail.formId;
    const formIdArr = [...this.props.formIdArr];
    formIdArr.push({ formId, createdTime: Math.floor(new Date().getTime() / 1000) });
    console.log(formIdArr, '<---------------------formIdArr');
    this.props.dispatch({
      type: 'common/save',
      payload: {
        formIdArr,
      },
    });
  };
  state = {
    openLogin: false,
    shopPlanId: null,
    next: null,
  };

  render() {
    const { userInfoLoading, loginLoading } = this.props;
    const { openLogin } = this.state;

    return (
      <Form reportSubmit onSubmit={this.getFormId}>
        <AtModal isOpened={openLogin}>
          <AtModalHeader>微信授权登录</AtModalHeader>
          <AtModalContent>
            <View className="logo-wrap">
              <Button
                className="logo plain"
                plain
                openType="getUserInfo"
                onGetUserInfo={this.loginFun}
                disabled={userInfoLoading || loginLoading}
              >
                <Image className="image" src={wxImg} />
              </Button>
              <View>
                <Text className="erduufont ed-back go" />
                <Text className="erduufont ed-back go" />
                <Text className="erduufont ed-back go" />
              </View>
              <View className="logo">
                <Image className="image" src={nbImg} />
              </View>
            </View>
          </AtModalContent>
          <AtModalAction>
            <Button
              loading={userInfoLoading || loginLoading}
              openType="getUserInfo"
              onGetUserInfo={this.loginFun}
              type="primary"
              formType="submit"
            >
              确认授权登录
            </Button>
          </AtModalAction>
        </AtModal>
      </Form>
    );
  }
}

// #region 导出注意
//
// 经过上面的声明后需要将导出的 Taro.Component 子类修改为子类本身的 props 属性
// 这样在使用这个子类时 Ts 才不会提示缺少 JSX 类型参数错误
//
// #endregion

export default Login as ComponentClass<PageOwnProps, PageState>;
