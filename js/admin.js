import { Toast, toastType, Popup } from './_notify.js';
import { domain, api_base, api_path, token } from './_apiConfig.js';

let orderData;
let chartData;

// -------- 訂單列表 --------//
const orderPageList = document.querySelector('#orderPageList');
const orderPageTable = document.querySelector('#orderPageTable');

// 取得訂單資訊 -> 渲染訂單列表、整理圖表資料 -> 渲染圖表
function getOrderData(){
  const url = `${domain}/api/livejs/v1/admin/${api_base}/${api_path.orders}`
  axios.get(url, token)
    .then(res => {
      orderData = res.data.orders;
      renderOrderList();
      getRevenueData();
      renderC3Chart();
    })
    .catch(err => console.log(err.response))
}

// 渲染訂單列表
function renderOrderList(){
  let orderItems = '';
  const tHead = `<thead>
                  <tr>
                    <th>訂單編號</th>
                    <th>聯絡人</th>
                    <th>聯絡地址</th>
                    <th>電子郵件</th>
                    <th>訂單品項</th>
                    <th>訂單日期</th>
                    <th>訂單狀態</th>
                    <th>操作</th>
                  </tr>
                </thead>`;
  // 開始跑每筆訂單
  orderData.forEach(order => {
    // 單筆訂單的"訂單品項"欄位
    let titleElement = '';
    order.products.forEach(item => {
      titleElement += `<p>${item.title}</p>`
    })
    // 單筆訂單的"訂單狀態"欄位
    let statusText = order.paid ? '已處理' : '未處理';
    // 組所有訂單
    orderItems += `<tr>
                    <td>${order.id}</td>
                    <td>
                      <p>${order.user.name}</p>
                      <p>${order.user.tel}</p>
                    </td>
                    <td>${order.user.address}</td>
                    <td>${order.user.email}</td>
                    <td>
                      ${titleElement}
                    </td>
                    <td>${dateConverter(order.createdAt)}</td>
                    <td class="orderStatus">
                      <a href="#" data-status="${order.paid}" data-id="${order.id}">${statusText}</a>
                    </td>
                    <td>
                      <input type="button" class="delSingleOrder-Btn" value="刪除" data-delete="${order.id}">
                    </td>
                  </tr>`
  })
  // 組成整個 table 丟進 html，視有無訂單來增加/移除按鈕禁用樣式
  const deleteAllBtn = orderPageList.querySelector('.discardAllBtn');
  if (orderData.length === 0){
    orderPageTable.innerHTML = `${tHead}<tbody><tr><td colspan="8" style="padding: 10px; text-align: center;">- 目前沒有訂單 -</td></tr></tbody>`
    deleteAllBtn.style.background = '#ddd'
    deleteAllBtn.style.color = '#fff'
    deleteAllBtn.style.borderColor = '#ddd'
    deleteAllBtn.style.pointerEvents = 'none';
    deleteAllBtn.setAttribute('disabled', 'true');
  } else {
    deleteAllBtn.removeAttribute('disabled')
    deleteAllBtn.removeAttribute('style')
    orderPageTable.innerHTML = `${tHead}<tbody>${orderItems}</tbody>`
  }

}

// 日期轉換（取自 圈圈#4060 同學作法）
function dateConverter(ms){
  // 取得資料為毫秒，需 * 1000
  const timer = new Date(ms * 1000);
  const y = timer.getFullYear() ;
  // getMonth() 會返回 0~11 -> 需 +1
  const m = timer.getMonth() + 1 >= 10 ?
            timer.getMonth() + 1 :`0${timer.getMonth()+1}`;
  const d = timer.getDate() >= 10 ?
            timer.getDate() : `0${timer.getDate()}`;
  return `${y}/${m}/${d}`;
};

// 點擊切換處理狀態 -> 發請求 -> 重新渲染訂單列表
function orderStatusSwitcher(e){
  e.preventDefault();
  const requestData = {data: {}};

  // 點到狀態欄以外的 -> 返回
  if(!e.target.hasAttribute('data-status'))
    return

  // 決定 request 資料 paid 要帶 true / false
  if(e.target.dataset.status === 'true'){
    requestData.data.paid = false
  } else if ((e.target.dataset.status === 'false')){
    requestData.data.paid = true
  }

  // 在 request 加上訂單 id
  requestData.data.id = e.target.dataset.id;

  // 發請求 -> 渲染訂單列表
  const url = `${domain}/api/livejs/v1/admin/${api_base}/${api_path.orders}`
  axios.put(url, requestData, token)
    .then(res => {
      orderData = res.data.orders;
      renderOrderList();
      toastType.success.title = '修改成功'
      Toast.fire(toastType.success)
    })
    .catch(err => console.log(err.data))
}

// 刪除的監聽，預設刪除全部
// 發出刪除請求 -> 重新取得資料並渲染圖表、訂單列表、提示訊息
function deleteOrderHandler(e){
  e.preventDefault()
  
  // 點擊非刪除按鈕 -> 返回
  if (!e.target.hasAttribute('data-delete'))
    return

  let url = `${domain}/api/livejs/v1/admin/${api_base}/${api_path.orders}`;
  let status = '';
  
  // 取得訂單狀態、組請求網址（單筆）
  if (e.target.dataset.delete === 'deleteAll'){
    orderData.forEach(order => {
      order.paid === false ? status = 'false' : order
    })
  } else {
    const statusDOM = e.target.closest('tr').querySelector('[data-status]');
    status = statusDOM.dataset.status;
    url += `/${e.target.dataset.delete}`
  }

  // toast 通知預設訊息
  toastType.success.title = '成功刪除'

  // 若有訂單未處理 -> popup 警告 -> 確認刪除/取消刪除 -> 發請求/跳取消 toast
  if (status === 'false'){
    Popup.fire({title: '訂單尚未處理，確定刪除嗎？'})
    .then(res => {
      if (res.isConfirmed){
        orderDeleteRequest(url, toastType.success)
      } else if (res.isDismissed){
        Swal.closePopup()
        toastType.success.title = '已取消刪除'
        Toast.fire(toastType.success)
      }
    })
    .catch(err => console.log(err))
  // 沒有訂單未處理 -> 直接刪除
  } else {
    orderDeleteRequest(url, toastType.success)
  }
}

// 刪除請求
function orderDeleteRequest(url, toast){
  axios.delete(url, token)
    .then(res => {
      orderData = res.data.orders
      renderOrderList()
      getRevenueData();
      renderC3Chart();
      Toast.fire(toast)
    })
    .catch(err => console.log(err.response))
}


// -------- 營收圖表 --------//

// 取得全品項營收資料
function getRevenueData(){
  // 合併所有 orderData[i].products 陣列 ->  [{訂單 1 品項A}, {訂單 1 品項B},....]
  let itemDataInOrders = orderData.reduce((all, order) => {
    all = all.concat(order.products)
    return all
  }, []);

  // 整理成品項不重複的 {品項 A: 營收, 品項 B: 營收 ... }物件
  let product_revenue = {};
  itemDataInOrders.forEach(product => {
    if (product_revenue[product.title]){
      product_revenue[product.title] += (product.price*product.quantity)
    } else {
      product_revenue[product.title] = (product.price*product.quantity)
    }
  })

  // 取出品項名（未排序）
  let keys = Object.keys(product_revenue)
  // 依品項營收大到小排序 [品項 A, 品項 B...]
  let sortedKeys = keys.sort(function(keyA, keyB){
    if(product_revenue[keyA] > product_revenue[keyB]){ 
      return -1  // AB
    } else if (product_revenue[keyA] <= product_revenue[keyB]){
      return 1   // BA
    }
  })

  // 組圖表資料
  // 若大於三項，留下前三的品項，以後的替換成"其他"
  let total = 0;
  chartData = []; // 每次組資料要先清空，重新 push，再 render 才不會出事
  sortedKeys.forEach((key, i) => {
    if (i >= 3){
      total += product_revenue[key]
      chartData[3] = ['其他', total]
    } else {
      chartData.push([key, product_revenue[key]])
    }
  })
}

// 渲染圖表
function renderC3Chart(){
  if (chartData.length === 0){
    document.querySelector('#revenueChart').innerHTML = '<p style="text-align: center;">- 目前沒有訂單 -</p>'
    return
  }

  let chart = c3.generate({
    bindto: '#revenueChart',
    data: {
      columns: chartData,
      type : 'pie',
      order: 'asc'
    },
    color: {
      pattern: ['#301e5f', '#5434a7', '#9d7fea', '#dacbff']
    },
    tooltip: {
      format: {
        value: function(value){
          let num = d3.format(',')
          return `${num(value)} 元`
        }
      }
  }
  });
}


// -------- 初始化 --------//
function init(){
  getOrderData();
  orderPageTable.addEventListener('click', orderStatusSwitcher);
  orderPageList.addEventListener('click', deleteOrderHandler);
}

init();
