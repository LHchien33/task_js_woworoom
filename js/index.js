import { Toast, toastType, Popup } from './_notify.js';
import { domain, api_base, api_path } from './_apiConfig.js';

let productData;
let cartsData;
let finalTotal;

// -------- 產品列表 -------- //
const productWrap = document.querySelector('.productWrap');
const productSelect = document.querySelector('.productSelect');
const productSpinner = document.querySelector('#productSpinner')

// 取得產品資料 + 渲染產品列表 + 下拉選單渲染 & 監聽
function getProductData(){
  const url = `${domain}/api/livejs/v1/customer/${api_base}/${api_path.products}`;
  axios.get(url)
  .then(res => {
    productData = res.data.products;
    productSpinner.style.display = 'none'
    renderProductList(productData);
    renderCategories();
    productSelect.addEventListener('change', categoriesHandler)
  })
  .catch(err => {
    console.log(err)
  })
}

// 渲染產品列表
function renderProductList(data){
  let str = '';
  data.forEach(obj => {
    let price = priceConverter(obj.price);
    let originPrice = priceConverter(obj.origin_price);
    // 組資料，btn 埋產品 id
    str += `
    <li class="productCard">
      <h4 class="productType">新品</h4>
      <img src="${obj.images}" alt="${obj.title}">
      <a href="#" class="addCartBtn" data-product-id="${obj.id}">加入購物車</a>
      <h3>${obj.title}</h3>
      <del class="originPrice">NT$${originPrice}</del>
      <p class="nowPrice">NT$${price}</p>
    </li>` 
  });

  productWrap.innerHTML = str;
}

// 價錢轉換（千位數逗點）
function priceConverter(num){
  if (num >= 1000){
    let arr = String((num / 1000).toFixed(3)).split('.');
    return `${arr[0]},${arr[1]}`
  } else {
    return num
  }
}

// 取得下拉選單選項
function getCategories(){
  const tempArr = [];
  productData.forEach(obj => tempArr.push(obj.category));
  return tempArr.filter((item, i) => tempArr.indexOf(item) === i);
}

// 渲染下拉選單選項
function renderCategories(){
  const categories = getCategories();
  let str = `<option value="全部" selected>全部</option>`;
  categories.forEach(c => str += `<option value="${c}">${c}</option>`)
  productSelect.innerHTML = str;
}

// 下拉選單監聽
function categoriesHandler(e){
  let filteredData = productData.filter(obj => obj.category === e.target.value)

  e.target.value !== '全部' ?
    renderProductList(filteredData) :
    renderProductList(productData)
}

// 加入購物車監聽
function addToCart(e){
  e.preventDefault();
  let targetAtt = e.target.getAttribute('class');
  let productId = e.target.dataset.productId;
  let cartId;
  let num = 1;
  let requestData = {"data": {}};

  if(targetAtt !== 'addCartBtn')
    return

  // 若購物車已有該品項，組 PATCH 資料
  cartsData.forEach(item => {
    if(productId === item.product.id){
      cartId = item.id;
      num = item.quantity + 1;
    }
  })

  // 加上按鈕禁用樣式
  e.target.setAttribute('disabled', 'true');
  e.target.style.pointerEvents = 'none';
  e.target.style.backgroundColor = '#aaa';

  // 發送 POST or PATCH 請求
  const url = `${domain}/api/livejs/v1/customer/${api_base}/${api_path.carts}`;
  
  // POST
  if(num === 1){
    requestData.data = {
      "productId": productId,
      "quantity": 1
    };
    axios.post(url, requestData)
      .then(res => {
        addToCartUIChange(e)
        cartsData = res.data.carts;
        finalTotal = priceConverter(res.data.finalTotal);
        renderCartList(cartsData, finalTotal);
      })
      .catch(err => console.log(err))
  // PATCH
  } else {
    requestData.data = {
      "id": cartId,
      "quantity": num
    };
    axios.patch(url, requestData)
      .then(res => {
        addToCartUIChange(e)
        cartsData = res.data.carts;
        finalTotal = priceConverter(res.data.finalTotal);
        renderCartList(cartsData, finalTotal);
      })
      .catch(err => console.log(err))
  }
}

// 加入購物車請求後的 UI change
function addToCartUIChange(e){
  e.target.removeAttribute('disabled');
  e.target.removeAttribute('style');
  toastType.success.title = '已加入購物車'
  Toast.fire(toastType.success)
}

// -------- 購物車列表 -------- //
const shoppingCartTable = document.querySelector('#shoppingCartTable');

// 取得購物車資料 + 渲染購物車列表 + 加入購物車監聽 + 刪除的監聽
function getCartsData(){
  let url = `${domain}/api/livejs/v1/customer/${api_base}/${api_path.carts}`;
  axios.get(url)
    .then(res => {
      cartsData = res.data.carts;
      finalTotal = priceConverter(res.data.finalTotal);
      renderCartList(cartsData, finalTotal);
      productWrap.addEventListener('click', addToCart);
      shoppingCartTable.addEventListener('click', deleteItem);
      // console.log(res.data)
    })
    .catch(err => console.log(err))
}

// 渲染購物車列表
function renderCartList(data, finalTotal){
  let cartItems = '';
  let tHead = `<thead>
                <tr>
                  <th width="40%">品項</th>
                  <th width="15%">單價</th>
                  <th width="15%">數量</th>
                  <th width="15%">金額</th>
                  <th width="15%"></th>
                </tr>
              </thead>`;

  // 組主要 item
  data.forEach(item => {
    let price = priceConverter(item.product.price);
    let totalPrice = priceConverter(item.product.price * item.quantity);
    cartItems += `<tr>
                    <td>
                      <div class="cardItem-title">
                        <img src="${item.product.images}" alt="${item.product.title}">
                        <p>${item.product.title}</p>
                      </div>
                    </td>
                    <td>NT$ ${price}</td>
                    <td>${item.quantity}</td>
                    <td>NT$ ${totalPrice}</td>
                    <td class="discardBtn">
                      <a href="#" class="material-icons" data-btn="${item.id}">clear</a>
                    </td>
                  </tr>`;
  });

  // 合併組成整個 table
  let wholeTable = `${tHead}${cartItems}
                    <tfoot>
                      <tr>
                        <td>
                          <a href="#" class="discardAllBtn" data-btn="deleteAll">刪除所有品項</a>
                        </td>
                        <td></td>
                        <td></td>
                        <td>
                          <p>總金額</p>
                        </td>
                        <td>NT$ ${finalTotal}</td>
                      </tr>
                    </tfoot>`;

  cartItems === '' ?
    shoppingCartTable.innerHTML = `${tHead}<tr><td>- 目前尚未加入商品 -</td></tr>` :
    shoppingCartTable.innerHTML = wholeTable;
}

// 刪除的監聽，預設刪除全部
function deleteItem(e){
  e.preventDefault();
  let url = `${domain}/api/livejs/v1/customer/${api_base}/${api_path.carts}`;

  // 不是點到 data-btn 時
  if(!e.target.hasAttribute('data-btn'))
    return

  // toast 通知預設訊息
  toastType.success.title = '已刪除商品'

  // 刪除單項（當 data-btn 為購物車 id 時）
  if(e.target.dataset.btn !== 'deleteAll'){
    url += `/${e.target.dataset.btn}` 
    deleteRequest(url, toastType.success)
    return
  }

  Popup.fire()
  .then((result) => {
    if (result.isConfirmed) {
      deleteRequest(url, toastType.success)
    } else if (result.isDismissed){
      Swal.closePopup()
      toastType.success.title = '已取消刪除'
      Toast.fire(toastType.success)
    }
  })
  .catch(err => {console.log(err)})
}

// 打包刪除購物車的請求
function deleteRequest(url, toast){
  axios.delete(url)
    .then(res => {
      cartsData = res.data.carts;
      finalTotal = priceConverter(res.data.finalTotal);
      renderCartList(cartsData, finalTotal);
      // 只在購物車全空時滾動
      if (cartsData.length === 0){
        window.scrollTo(0, shoppingCartTable.offsetTop - document.documentElement.clientHeight/2)
        setTimeout(() => Toast.fire(toast), 500)
        return
      }
      Toast.fire(toast)
    })
    .catch(err => console.log(err))
}

// -------- 訂購表單 -------- //
// 設定驗證條件 -> 取得表單資料 -> 執行驗證
// -> 未通過 -> 渲染驗證訊息
// -> 通過 -> 發送請求

// 表單驗證
let constraints = {};
let orderInfo = {};
let invalidMessage;
const orderInfoForm = document.querySelector('#orderInfoForm')
const allNamedDOM = orderInfoForm.querySelectorAll('[name]');
const allMessageBox = orderInfoForm.querySelectorAll('.orderInfo-message');
const orderSpinner = document.querySelector('#orderSpinner')

//（進頁面時）設定驗證條件
function setFormValidator(){
  // 取得所有 input name 值
  let allNamesValue = [];
  allNamedDOM.forEach(item => allNamesValue.push(item.getAttribute('name')));

  // constraints 物件加上"必填"驗證條件
  allNamesValue.forEach(name => {
    constraints[`${name}`] = {
      presence: {
        allowEmpty: false, 
        message: "必填"
      }
    };
  })

  // 客製其他驗證條件
  constraints['電話'].numericality = {
    onlyInteger: true,
    notValid: '請輸入數字'
  };

  constraints['電話'].length = {
    minimum: 8,
    maximum: 10,
    tooShort: '請輸入至少 %{count} 碼，例如 04 - 12345678',
    tooLong: '請輸入至多 %{count} 碼，例如 04 - 12345678'
  };

  constraints['Email'].email = {
    message: '請輸入正確格式，例如 123@mail.com'
  };

}

// 取得表單資料 + 執行驗證
function getOrderInfo(){
  // 取得表單資料
  allNamedDOM.forEach(dom => {
    let name = dom.getAttribute('name');
    if (name === '電話'){
      orderInfo[`${name}`] = (dom.value).replaceAll('-', '').replaceAll(' ', '').trim()
    } else {
      orderInfo[`${name}`] = dom.value.trim()
    }
  })

  // 執行驗證
  invalidMessage = validate(orderInfo, constraints, {fullMessages: false});
}

// 渲染驗證訊息
function renderValidateMessage(){
  // 全部欄位通過驗證 -> 清空訊息
  if (invalidMessage === undefined){
    allMessageBox.forEach(p => p.textContent = '')
    return
  }
  
  // 個別欄位的渲染
  allMessageBox.forEach(p => {
    let name = p.previousElementSibling.getAttribute('name');
    // 未通過驗證者 -> 顯示訊息
    if (invalidMessage[name] !== undefined){
      p.textContent = invalidMessage[name][0];
    // 否則清空訊息
    } else if (invalidMessage[name] === undefined){
      p.textContent = ''
    }
  })
}

// 啟動驗證 & 渲染
function runValidator(){
  getOrderInfo();
  renderValidateMessage();
}

// runValidator() -> 發送請求 -> 表單清空 + 購物車重新渲染
function orderRequest(e){
  e.preventDefault();
  runValidator()
  const url = `${domain}/api/livejs/v1/customer/${api_base}/${api_path.orders}`;
  const requestData = {
    "data": {
      "user": {
        "name": `${orderInfo['姓名']}`,
        "tel": `${orderInfo['電話']}`,
        "email": `${orderInfo['Email']}`,
        "address": `${orderInfo['寄送地址']}`,
        "payment": `${orderInfo['交易方式']}`
      }
    }
  };
  
  // 有未通過的欄位
  if(invalidMessage !== undefined){
    toastType.warning.title = '請完整填寫訂單資訊'
    Toast.fire(toastType.warning);
    return 
  }

  // 購物車沒有商品
  if (cartsData.length === 0){
    toastType.warning.title = '購物車尚未加入任何商品'
    Toast.fire(toastType.warning);
    return
  }

  // 避免表單內 enter 送出
  if(document.onkeydown === false)
    return

  // 發請求 + 表單清空 + 產品列表、購物車重新渲染
  // loading 動畫啟動
  orderSpinner.classList.toggle('orderSpinner--active')
  axios.post(url, requestData)
  .then(res => {
    getProductData();
    getCartsData();
    orderInfoForm.reset();
    orderSpinner.classList.toggle('orderSpinner--active');
    toastType.success.title = '已送出訂單'
    Toast.fire(toastType.success);
    setTimeout(() => {window.scrollTo(0, productWrap.parentElement.offsetTop)}, 500)
  })
  .catch(err => console.log(err))
}



// -------- 初始化 -------- //
function init(){
  getProductData();
  getCartsData();
  setFormValidator();
  orderInfoForm.addEventListener('change', runValidator);
  orderInfoForm.addEventListener('submit', orderRequest);
   // 若是在 input 內按下的 enter，回傳假值避免送出表單
  document.onkeydown = function(e) {
    let target, code, tag;
    target = e.target;
    code = e.code;
    if (code === 'Enter') {
      tag = target.tagName;
      if (tag == "INPUT") { return false; }
    }
  };
}


// -------- 執行 -------- //
init();