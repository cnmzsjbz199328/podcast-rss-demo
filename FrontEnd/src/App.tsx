import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { LocaleProvider } from '@/contexts/LocaleContext'
import Home from '@/pages/Home'
import PodcastPlayer from '@/pages/PodcastPlayer'
import TopicList from '@/pages/TopicList'
import TopicDetail from '@/pages/TopicDetail'
import CreateTopic from '@/pages/CreateTopic'

function App() {
  return (
    <LocaleProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/podcast/:episodeId" element={<PodcastPlayer />} />
          <Route path="/topics" element={<TopicList />} />
          <Route path="/topics/:topicId" element={<TopicDetail />} />
          <Route path="/topics/create" element={<CreateTopic />} />
        </Routes>
      </Router>
    </LocaleProvider>
  );
}

export default App
