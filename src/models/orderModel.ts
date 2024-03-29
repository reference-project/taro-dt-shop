import * as Api from '../service/apiService';
import Taro from '@tarojs/taro';

export default {
  namespace: 'order',
  state: {
    page: 1,
    size: 10,
    status: undefined,
    loadOver: false,
    refresh: true,
    search: undefined,
    orderList: [],
    Detail: null,
  },

  effects: {
    *OrderList(_, { call, put, select }) {
      const { loadOver, orderList, refresh, page, size, status, search } = yield select(
        state => state.order
      );
      console.log(loadOver, 'loadOver');

      if (loadOver) return;

      const res = yield call(Api.orderList, { page, size, status, search });
      Taro.stopPullDownRefresh();

      if (res.errno !== 0) return;
      yield put({
        type: 'save',
        payload: {
          orderList: refresh ? res.data.data : orderList.concat(res.data.data),
          loadOver: res.data.data.length < size,
          refresh: false,
        },
      });
    },
    *Detail({ payload }, { call, put, select }) {
      const { orderList } = yield select(state => state.order);
      let detail = orderList.find(ele => ele.id === payload.id);
      if (detail) return detail;
      const res = yield call(Api.orderDetail, payload);
      if (res.errno === 0) {
        return res.data;
      }
      return null;
    },
    *Cancel({ payload }, { call, put, select }) {
      const { orderList } = yield select(state => state.order);
      const res = yield call(Api.orderCancel, payload);
      if (res.errno === 0) {
        const tmp = orderList.filter(ele => {
          if (ele.id === payload.orderId) return false;
          return true;
        });
        yield put({
          type: 'save',
          payload: {
            orderList: tmp,
          },
        });
      }
    },
    *goodsDetail({ payload }, { call }) {
      const res = yield call(Api.orderGoodsDetail, payload);
      if (res.errno === 0) {
        return res.data;
      }
      return null;
    },
  },

  reducers: {
    save(state, { payload }) {
      return { ...state, ...payload };
    },
  },
};
