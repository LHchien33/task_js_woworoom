export const Toast = Swal.mixin({
  toast: true,
  position: 'top',
  showConfirmButton: false,
  timer: 1500,
  color: '#301e5f',
  customClass: { icon: 'toast-icon-custom' },
  showClass: { popup: 'animate__animated animate__slideInDown' },
  hideClass: { popup: 'animate__animated animate__fadeOut' }
});

// usage: Toast.fire(toastType.success)
export const toastType = {
  // 打勾 + 綠色
  success: {
    background: '#b4da5b',
    iconHtml: '<span class="material-symbols-outlined">done</span>'
  },
  // 圓驚嘆 + 黃色
  warning: {
    background: '#ffe169',
    iconHtml: '<span class="material-symbols-outlined">error</span>'
  }
}

// only for deleting lots of data at once
export const Popup = Swal.mixin({
  icon: 'warning',
  title: '確定刪除全部商品嗎？',
  showCancelButton: true,
  confirmButtonColor: '#d33',
  confirmButtonText: '是，刪除',
  cancelButtonText: '否，取消',
  reverseButtons: true,
  showClass: { popup: 'animate__animated animate__slideInDown' },
  hideClass: { popup: 'animate__animated animate__fadeOut' },
  didOpen: () => document.body.style.paddingRight = '0px'
});

