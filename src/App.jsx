import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import DocumentScanner from './modules/DocumentScanner.jsx'
import FristenRechner from './modules/FristenRechner.jsx'
import GebuehrenRechner from './modules/GebuehrenRechner.jsx'
import Zustaendigkeit from './modules/Zustaendigkeit.jsx'
import Prozesskosten from './modules/Prozesskosten.jsx'
import Rechtsmittel from './modules/Rechtsmittel.jsx'
import Verjaehrung from './modules/Verjaehrung.jsx'
import Verfahrenshilfe from './modules/Verfahrenshilfe.jsx'
import Situationsberater from './modules/Situationsberater.jsx'
import Unterhalt from './modules/Unterhalt.jsx'
import Impressum from './pages/Impressum.jsx'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/scanner" element={<DocumentScanner />} />
        <Route path="/fristen" element={<FristenRechner />} />
        <Route path="/gebuehren" element={<GebuehrenRechner />} />
        <Route path="/zustaendigkeit" element={<Zustaendigkeit />} />
        <Route path="/prozesskosten" element={<Prozesskosten />} />
        <Route path="/rechtsmittel" element={<Rechtsmittel />} />
        <Route path="/verjaehrung" element={<Verjaehrung />} />
        <Route path="/verfahrenshilfe" element={<Verfahrenshilfe />} />
        <Route path="/situationen" element={<Situationsberater />} />
        <Route path="/unterhalt" element={<Unterhalt />} />
        <Route path="/impressum" element={<Impressum />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Layout>
  )
}
