import Taro, { Component } from '@tarojs/taro';
import { ComponentClass } from 'react';
import { View, Text, Image, Button, ScrollView, Input, Switch, Form } from '@tarojs/components';
import communityImg from '../../static/images/community.png';
import { connect } from '@tarojs/redux';
import './index.scss';
import {
  AtAvatar,
  AtButton,
  AtModal,
  AtModalHeader,
  AtModalContent,
  AtModalAction,
  AtInput,
} from 'taro-ui';
import { tip } from '../../utils/tool';

type PageState = {};
interface PageDvaProps {
  dispatch: Function;
  userInfo: any;
  checkedGoodsList: any[];
  getPhoneloading: boolean;
  couponId: number;
}

interface PageOwnProps {
  //父组件要传
}
interface PageStateProps {
  // 自己要用的
  formIdArr: any[];
}
type IProps = PageStateProps & PageDvaProps & PageOwnProps;

@connect(({ cart, loading, common }) => ({
  ...cart,
  ...common,
  getPhoneLoading: loading.effects['common/login'],
}))
class CheckOut extends Component<IProps, {}> {
  config = {
    navigationBarTitleText: '结算',
  };

  async componentDidShow() {
    const res = await this.props.dispatch({
      type: 'cart/Checkout',
      payload: {
        score: this.state.score,
        couponId: this.props.couponId,
      },
    });
    this.setState({
      ...res,
      couponList: res.couponList,
    });
    this.setState({
      postscript: this.props.userInfo.postscript,
    });
    if (!this.props.userInfo.mobile) {
      setTimeout(() => {
        this.setState({ openModal: true });
        this.props.dispatch({
          type: 'common/wxCode',
        });
      }, 100);
    }
  }
  async onPullDownRefresh() {
    await this.componentDidShow();
    Taro.stopPullDownRefresh();
  }

  nextTab = url => {
    Taro.switchTab({ url });
  };
  nextPage = url => {
    Taro.navigateTo({ url });
  };
  getPhone = async event => {
    if (event.detail.errMsg !== 'getPhoneNumber:ok') {
      tip('获取手机号失败');
      return;
    }
    const res = await this.props.dispatch({
      type: 'common/BindPhone',
      payload: {
        encryptedData: event.detail.encryptedData,
        iv: event.detail.iv,
      },
    });
    if (res.errno === 0) {
      this.setState({ openModal: false });
    }
  };
  changePostscript = postscript => {
    this.setState({ postscript });
  };
  setScore = async e => {
    console.log(e);

    this.setState(
      {
        score: e.target.value,
      },
      () => {
        this.componentDidShow();
      }
    );
  };
  scoreClick = async () => {
    const totalScore = this.state.totalScore;
    if (totalScore < 100) {
      tip('未满100积分，无法使用');
    }
  };
  makePhone = () => {
    Taro.makePhoneCall({
      phoneNumber: this.props.userInfo.colonelInfo.mobile,
    });
  };

  openAddrSet = () => {
    this.setState({ addrSet: false }, () => {
      this.selectAddr();
    });
  };

  selectAddr = async () => {
    let res;
    try {
      res = await Taro.chooseAddress();
    } catch (err) {
      if (err.errMsg === 'chooseAddress:fail auth deny') {
        this.setState({ addrSet: true });
      }
      return;
    }
    console.log(res);
    if (res.errMsg === 'chooseAddress:fail cancel') return;
    this.setState({
      myAddress: res,
    });
  };
  inputPostscript = async postscript => {
    console.log(postscript);
    this.setState({ postscript });
  };

  submitOrder = async isReplace => {
    const { userInfo, dispatch, couponId } = this.props;
    const { myAddress, score, postscript } = this.state;
    if (!userInfo.uid) {
      tip('请先绑定小区');
      return;
    }

    if (!userInfo.colonelId && !myAddress) {
      tip('请选择地址');
      return;
    }
    console.log(isReplace);

    if (isReplace && !postscript) {
      tip('请填写代客下单信息');
      return;
    }
    this.close();
    const payload = {
      couponId,
      score,
      postscript,
    };
    if (myAddress) {
      Object.assign(payload, myAddress);
    }
    const orderRes = await dispatch({
      type: 'cart/OrderSubmit',
      payload,
    });
    if (!orderRes) return;
    const payParam = await dispatch({
      type: 'cart/Prepay',
      payload: {
        orderId: orderRes.id,
      },
    });
    if (!payParam) {
      Taro.switchTab({ url: '/pages/ucenter/index?to=order' });
      return;
    }
    await Taro.requestPayment({
      timeStamp: payParam.timeStamp,
      nonceStr: payParam.nonceStr,
      package: payParam.package,
      signType: payParam.signType,
      paySign: payParam.paySign,
      success: res => {
        if (res.errMsg === 'requestPayment:fail cancel') {
          Taro.redirectTo({
            url: `/pages/order/purchased?orderId=${orderRes.id}&type=no`,
          });
        } else {
          Taro.redirectTo({
            url: `/pages/order/purchased?orderId=${orderRes.id}&type=ok`,
          });
        }
      },
      fail: res => {
        if (res.errMsg === 'requestPayment:fail cancel') {
          Taro.redirectTo({
            url: `/pages/order/purchased?orderId=${orderRes.id}&type=no`,
          });
        } else {
          Taro.redirectTo({
            url: `/pages/order/purchased?orderId=${orderRes.id}&type=ok`,
          });
        }
      },
    });
  };

  replaceOrder = () => {
    this.setState({ openModalRep: true });
  };
  close = () => {
    this.setState({ openModalRep: false });
  };

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
    score: false,
    checkedAddress: null,
    freightPrice: 0,
    couponList: [],
    couponPrice: 0,
    scoreToPrice: 0,
    checkedGoodsList: [],
    goodsTotalPrice: 0,
    orderTotalPrice: 0,
    actualPrice: 0,
    totalScore: 0,

    myAddress: null,
    openModal: false,
    openModalRep: false,
    postscript: '',
    addrSet: false,
  };

  render() {
    const { userInfo, getPhoneloading, couponId } = this.props;
    const {
      score,
      checkedGoodsList,
      myAddress,
      openModal,
      openModalRep,
      actualPrice,
      goodsTotalPrice,
      freightPrice,
      couponPrice,
      scoreToPrice,
      totalScore,
      couponList,
      postscript,
      addrSet,
    }: any = this.state;

    const cgl1 = checkedGoodsList.filter(ele => ele.goods_type !== 3);
    const cgl2 = checkedGoodsList.filter(ele => ele.goods_type === 3);
    const couponInfo = couponList.find(ele => ele.id === couponId);
    console.log(couponInfo);

    return (
      <View className="cart-page bg">
        {userInfo.colonelId && (
          <View className="tip">
            免费代收，到货后请到小区长代收点自提，如需送货上门请联系小区长
            <Text className="blue" onClick={this.makePhone}>
              {userInfo.colonelInfo.mobile}
            </Text>
          </View>
        )}
        {!userInfo.colonelId && userInfo.communityId && (
          <View className="tip">
            该小区暂无小区长{' '}
            <Text className="text" onClick={this.nextPage}>
              我要申请
            </Text>
          </View>
        )}
        <View className="address-wrap">
          <View className="top">
            {userInfo.communityId ? (
              <View className="community-wrap">
                <Image src={communityImg} />
                {userInfo.name}
                {/* {userInfo.colonelId && userInfo.communityId && (
                  <View className="input-wrap">
                    <AtInput
                      placeholder="我的详细楼栋、门牌号"
                      name="house"
                      disabled={!!this.props.userInfo.house}
                      value={house}
                      onChange={this.inputHouse}
                    />
                  </View>
                )} */}
              </View>
            ) : (
              <View className="select-addr">
                <AtButton
                  size="small"
                  type="secondary"
                  onClick={this.nextPage.bind(this, '/pages/neighbor/search')}
                >
                  绑定小区
                </AtButton>
              </View>
            )}
            {userInfo.colonelId ? (
              <View className="colonel-wrap">
                <View className="badge">小区长</View>
                <View className="ava-wrap">
                  <AtAvatar circle size="normal" image={userInfo.colonelInfo.avatarUrl} />
                </View>
                <View className="info">
                  <View className="name">{userInfo.colonelInfo.nickName}</View>
                  <View className="name">{userInfo.colonelInfo.mobile}</View>
                  <View className="p">{userInfo.city + userInfo.address}</View>
                </View>
              </View>
            ) : (
              <View className="colonel-wrap">
                <View className="ava-wrap">
                  <AtAvatar circle size="normal" image={userInfo.avatarUrl} />
                </View>
                <View className="info">
                  <View className="name">{userInfo.nickName}</View>
                  <View className="name">{userInfo.mobile}</View>
                  {myAddress ? (
                    <View className="p">
                      {myAddress.cityName + myAddress.countyName + myAddress.detailInfo}
                    </View>
                  ) : (
                    <View>
                      {!addrSet ? (
                        <AtButton size="small" type="secondary" onClick={this.selectAddr}>
                          选择地址
                        </AtButton>
                      ) : (
                        <AtButton
                          size="small"
                          type="secondary"
                          openType="openSetting"
                          onOpenSetting={this.openAddrSet}
                        >
                          选择地址
                        </AtButton>
                      )}
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>
        <View className="bar" />

        {cgl1 && cgl1.length && (
          <View className="gsi-wrap">
            <View className="title">次日达</View>
            <ScrollView scrollX={true}>
              <View className="goods-simple-item">
                {cgl1.map(ele => (
                  <View key={ele.id} className="img-wrap">
                    <Image className="img" src={ele.pic_url + '@!200X200'} />
                  </View>
                ))}
                <View className="img-wrap" style={{ color: '#fff' }}>
                  0000
                </View>
              </View>
            </ScrollView>
            <View className="total-num">
              共<Text className="b">{cgl1.length}</Text>件
            </View>
            <View className="send">
              <View className="label">配送</View>
              <View className="value">次日达</View>
            </View>
          </View>
        )}
        {cgl2 && cgl2.length && (
          <View className="gsi-wrap">
            <View className="title">预售</View>
            <ScrollView scrollX={true}>
              <View className="goods-simple-item">
                {cgl2.map(ele => (
                  <View className="img-wrap">
                    <Image className="img" src={ele.pic_url + '@!200X200'} />
                  </View>
                ))}
                <View className="img-wrap" style={{ color: '#fff' }}>
                  0000
                </View>
              </View>
            </ScrollView>
            <View className="total-num">
              共<Text className="b">{cgl2.length}</Text>件
            </View>
            {/* <View className="send">
              <View className="label">预计配送</View>
              <View className="value">时间</View>
            </View> */}
          </View>
        )}
        <View className="block-wrap">
          <View
            className="item mh"
            onClick={this.nextPage.bind(this, '/pages/ucenter/coupon?type=use')}
          >
            <View className="label">红包</View>
            <View className="value">
              {couponList.find(ele => ele.id === couponId)
                ? couponList.find(ele => ele.id === couponId).name
                : '无可用红包'}
              <Text className="erduufont ed-back go" />
            </View>
          </View>
          {!userInfo.isColonel && (
            <View className="item">
              <View className="label">
                积分
                <View className="span">
                  共<Text className="b">{totalScore}</Text>积分，100积分抵扣1元，
                  {totalScore < 100 ? '满100积分可用' : `可抵扣${(totalScore / 100).toFixed(1)}元`}
                </View>
              </View>
              <View className="value">
                <Switch
                  color="#f39b8b"
                  disabled={totalScore < 100}
                  checked={score}
                  onClick={this.scoreClick}
                  onChange={this.setScore}
                />
              </View>
            </View>
          )}
        </View>
        <View className="block-wrap">
          <View className="item">
            <View className="label">商品总价</View>
            <View className="value">{goodsTotalPrice.toFixed(1)}</View>
          </View>
          <View className="item">
            <View className="label">配送费</View>
            <View className="value red">+ {freightPrice.toFixed(1)}</View>
          </View>
          <View className="item">
            <View className="label">红包</View>
            <View className="value red">- {couponPrice.toFixed(1)}</View>
          </View>
          {!userInfo.isColonel && (
            <View className="item">
              <View className="label">积分</View>
              <View className="value red">- {scoreToPrice.toFixed(1)}</View>
            </View>
          )}
        </View>

        <View className="bottom">
          <View className="check-wrap center">
            <Text className="big">￥{actualPrice.toFixed(1)}</Text>
          </View>

          {userInfo.isColonel && (
            <View className="add-cart">
              <AtButton type="primary" className="replace" onClick={this.replaceOrder}>
                代客下单
              </AtButton>
            </View>
          )}

          <View className="add-cart">
            <Form reportSubmit onSubmit={this.getFormId}>
              <AtButton
                type="primary"
                formType="submit"
                onClick={this.submitOrder.bind(this, null)}
              >
                提交订单
              </AtButton>
            </Form>
          </View>
        </View>

        <AtModal isOpened={openModal} closeOnClickOverlay={false}>
          <AtModalHeader>提示</AtModalHeader>
          <AtModalContent>
            <View style={{ textAlign: 'center' }}>需要绑定手机号才能继续下单</View>
          </AtModalContent>
          <AtModalAction>
            <Button
              loading={getPhoneloading}
              openType="getPhoneNumber"
              onGetPhoneNumber={this.getPhone}
              type="primary"
            >
              确定
            </Button>
          </AtModalAction>
        </AtModal>
        <AtModal isOpened={openModalRep} closeOnClickOverlay={true} onClose={this.close}>
          <AtModalHeader>请备注客户信息</AtModalHeader>
          <AtModalContent>
            <View className="input-wrap">
              <AtInput
                placeholder="客户称呼或手机号"
                name="postscript"
                disabled={!!this.props.userInfo.postscript}
                value={postscript}
                onChange={this.inputPostscript}
              />
            </View>
          </AtModalContent>
          <AtModalAction>
            <Button onClick={this.close}>取消</Button>
            <Button type="primary" onClick={this.submitOrder.bind(this, 'replace')}>
              确定代客下单
            </Button>
          </AtModalAction>
        </AtModal>
      </View>
    );
  }
}
export default CheckOut as ComponentClass<PageOwnProps, PageState>;
