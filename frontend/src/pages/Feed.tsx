import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { supabase, getSession } from '../lib/auth';
import { useT } from '../context/LanguageContext';
import { Heart, MessageCircle, ArrowRight, Users, Flag, TrendingUp } from 'lucide-react';

const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  INFRASTRUCTURE: { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  COMMUNITY:      { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  SUSTAINABILITY: { color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  SECURITY:       { color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  OTHER:          { color: '#9ca3af', bg: 'rgba(156,163,175,0.12)' },
};

function timeAgo(dateStr: string | Date, t: (k: any, v?: any) => string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60)  return t('feed.ago_just_now');
  if (diff < 3600) return t('feed.ago_minutes', { n: String(Math.floor(diff / 60)) });
  if (diff < 86400) return t('feed.ago_hours', { n: String(Math.floor(diff / 3600)) });
  return t('feed.ago_days', { n: String(Math.floor(diff / 86400)) });
}

interface FeedProject {
  id: string;
  title: string;
  summary: string;
  category: string;
  status: string;
  fundingPct: number;
  ethRaised: number;
  ethGoal: number;
  investorCount: number;
  milestoneCount: number;
  createdAt: string;
  updatedAt: string;
  commentCount: number;
  recentComments: Comment[];
  likes: number;
  liked: boolean;
}

interface Comment {
  id: string;
  projectId: string;
  userId: string;
  username: string;
  text: string;
  createdAt: string;
}

function ProjectCard({ project, userId }: { project: FeedProject; userId: string | null }) {
  const t = useT();
  const [likes, setLikes] = useState(project.likes);
  const [liked, setLiked] = useState(project.liked);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>(project.recentComments ?? []);
  const [commentCount, setCommentCount] = useState(project.commentCount);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const cat = CATEGORY_COLORS[project.category] ?? CATEGORY_COLORS.OTHER;

  const handleLike = async () => {
    if (!userId) return;
    // Optimistic update
    const newLiked = !liked;
    setLiked(newLiked);
    setLikes(prev => newLiked ? prev + 1 : Math.max(0, prev - 1));
    try {
      const { data } = await axios.post(`/api/feed/projects/${project.id}/like`);
      setLiked(data.liked);
      setLikes(data.count);
    } catch {
      // revert
      setLiked(!newLiked);
      setLikes(prev => newLiked ? Math.max(0, prev - 1) : prev + 1);
    }
  };

  const loadAllComments = async () => {
    try {
      const { data } = await axios.get(`/api/feed/projects/${project.id}/comments`);
      setComments(data.comments);
      setAllLoaded(true);
    } catch { /* ignore */ }
  };

  const toggleComments = () => {
    const next = !showComments;
    setShowComments(next);
    if (next && !allLoaded) loadAllComments();
  };

  const postComment = async () => {
    const text = commentText.trim();
    if (!text || posting) return;
    setPosting(true);
    try {
      const { data } = await axios.post(`/api/feed/projects/${project.id}/comments`, { text });
      setComments(prev => [data.comment, ...prev]);
      setCommentCount(prev => prev + 1);
      setCommentText('');
    } catch { /* ignore */ } finally {
      setPosting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      postComment();
    }
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: '#0d1520', border: '1px solid #1e2d3d' }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: cat.bg, color: cat.color }}
              >
                {t(`category.${project.category.toLowerCase()}` as any) || project.category}
              </span>
              <span className="text-xs" style={{ color: '#4b5563' }}>
                {timeAgo(project.updatedAt, t)}
              </span>
            </div>
            <Link
              to={`/projects/${project.id}`}
              className="text-base font-semibold leading-snug hover:underline"
              style={{ color: '#e8f4f0' }}
            >
              {project.title}
            </Link>
          </div>
        </div>

        <p className="text-sm leading-relaxed line-clamp-3" style={{ color: '#6b7280' }}>
          {project.summary}
        </p>
      </div>

      {/* Funding bar */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5" style={{ color: '#9ca3af' }}>
            <TrendingUp size={12} />
            <span className="text-xs">{project.fundingPct}% funded</span>
          </div>
          <span className="text-xs font-mono" style={{ color: '#6b7280' }}>
            {project.ethRaised.toFixed(3)} / {project.ethGoal.toFixed(2)} ETH
          </span>
        </div>
        <div className="w-full rounded-full h-1.5" style={{ background: '#1e2d3d' }}>
          <div
            className="h-1.5 rounded-full transition-all"
            style={{ width: `${project.fundingPct}%`, background: '#00e5c4' }}
          />
        </div>
      </div>

      {/* Meta row */}
      <div
        className="px-5 py-3 flex items-center gap-4"
        style={{ borderTop: '1px solid #1e2d3d' }}
      >
        <div className="flex items-center gap-1.5 text-xs" style={{ color: '#6b7280' }}>
          <Users size={12} />
          {t('feed.investors', { n: String(project.investorCount) })}
        </div>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: '#6b7280' }}>
          <Flag size={12} />
          {t('feed.milestones', { n: String(project.milestoneCount) })}
        </div>
        <div className="flex-1" />
        <Link
          to={`/projects/${project.id}`}
          className="flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-80"
          style={{ color: '#00e5c4' }}
        >
          {t('feed.view_project')} <ArrowRight size={11} />
        </Link>
      </div>

      {/* Actions */}
      <div
        className="px-5 py-3 flex items-center gap-3"
        style={{ borderTop: '1px solid #1e2d3d' }}
      >
        <button
          onClick={handleLike}
          disabled={!userId}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-all"
          style={{
            background: liked ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.04)',
            color: liked ? '#f87171' : '#9ca3af',
            border: liked ? '1px solid rgba(248,113,113,0.25)' : '1px solid #1e2d3d',
            cursor: userId ? 'pointer' : 'default',
          }}
        >
          <Heart size={14} fill={liked ? '#f87171' : 'none'} />
          <span>{likes > 0 ? likes : ''} {liked ? t('feed.liked') : t('feed.like')}</span>
        </button>

        <button
          onClick={toggleComments}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-all"
          style={{
            background: showComments ? 'rgba(0,229,196,0.08)' : 'rgba(255,255,255,0.04)',
            color: showComments ? '#00e5c4' : '#9ca3af',
            border: showComments ? '1px solid rgba(0,229,196,0.2)' : '1px solid #1e2d3d',
          }}
        >
          <MessageCircle size={14} />
          <span>{commentCount > 0 ? commentCount : ''} {t('feed.comments_label')}</span>
        </button>
      </div>

      {/* Comments panel */}
      {showComments && (
        <div style={{ borderTop: '1px solid #1e2d3d' }}>
          {/* Comment input */}
          {userId && (
            <div className="px-5 pt-4 pb-3 flex gap-2">
              <textarea
                ref={textareaRef}
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('feed.comment_placeholder')}
                rows={1}
                className="flex-1 rounded-lg px-3 py-2 text-sm resize-none"
                style={{
                  background: '#080c10',
                  border: '1px solid #1e2d3d',
                  color: '#e8f4f0',
                  outline: 'none',
                  minHeight: '36px',
                  maxHeight: '96px',
                }}
                onInput={e => {
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = Math.min(el.scrollHeight, 96) + 'px';
                }}
              />
              <button
                onClick={postComment}
                disabled={posting || !commentText.trim()}
                className="px-3 py-2 rounded-lg text-xs font-semibold transition-opacity"
                style={{
                  background: commentText.trim() ? '#00e5c4' : '#1e2d3d',
                  color: commentText.trim() ? '#080c10' : '#4b5563',
                  cursor: commentText.trim() ? 'pointer' : 'default',
                }}
              >
                {posting ? '…' : t('feed.comment_send')}
              </button>
            </div>
          )}

          {/* Comment list */}
          <div className="px-5 pb-4 space-y-3">
            {comments.length === 0 ? (
              <p className="text-xs py-2" style={{ color: '#4b5563' }}>No comments yet. Be first!</p>
            ) : (
              comments.map(c => (
                <div key={c.id} className="flex gap-2.5">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: '#1e2d3d', color: '#00e5c4' }}
                  >
                    {c.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold" style={{ color: '#e8f4f0' }}>{c.username}</span>
                      <span className="text-xs" style={{ color: '#4b5563' }}>{timeAgo(c.createdAt, t)}</span>
                    </div>
                    <p className="text-sm mt-0.5 leading-snug" style={{ color: '#9ca3af' }}>{c.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Feed() {
  const t = useT();
  const [feed, setFeed] = useState<FeedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    axios.get('/api/feed')
      .then(({ data }) => setFeed(data.feed ?? []))
      .catch(() => setFeed([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen" style={{ background: '#080c10' }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1" style={{ color: '#e8f4f0' }}>{t('feed.title')}</h1>
          <p className="text-sm" style={{ color: '#6b7280' }}>{t('feed.subtitle')}</p>
        </div>

        {loading ? (
          <p className="text-sm text-center py-16" style={{ color: '#4b5563' }}>{t('feed.loading')}</p>
        ) : feed.length === 0 ? (
          <p className="text-sm text-center py-16" style={{ color: '#4b5563' }}>{t('feed.empty')}</p>
        ) : (
          <div className="space-y-4">
            {feed.map(project => (
              <ProjectCard key={project.id} project={project} userId={userId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
