import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import './index.css'
import 'antd/dist/reset.css'
import App from './App.tsx'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { store } from './store'

createRoot(document.getElementById('root')!).render(
     <Provider store={store}>
          <>
               <App />
               <ToastContainer
                    position="top-right"
                    autoClose={3500}
                    newestOnTop
                    closeOnClick
                    pauseOnHover
                    theme="light"
               />
          </>
     </Provider>
)
