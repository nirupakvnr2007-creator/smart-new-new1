import React, { useState } from 'react';
import { ForumPost, RoleType, UserAccount } from '../../types';

interface ForumScreenProps {
  posts: ForumPost[];
  currentUser: UserAccount;
  onAddPost: (post: ForumPost) => void;
  onAddReply: (postId: string, content: string, author: string, role: RoleType) => void;
  onToggleResolve: (postId: string) => void;
  onShowToast: (msg: string) => void;
}

export const ForumScreen: React.FC<ForumScreenProps> = ({
  posts,
  currentUser,
  onAddPost,
  onAddReply,
  onToggleResolve,
  onShowToast
}) => {
  const [filterTag, setFilterTag] = useState<string>('All');
  const [showPostModal, setShowPostModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTag, setNewTag] = useState<
    'Restock Flag' | 'Floor Alert' | 'Shift Note' | 'General'
  >('General');

  // Replying state
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const shopPosts = currentUser.shopId
    ? posts.filter((p) => !p.shopId || p.shopId === currentUser.shopId)
    : posts;

  const filteredPosts =
    filterTag === 'All' ? shopPosts : shopPosts.filter((p) => p.tag === filterTag);

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      onShowToast('Please provide a title and note description.');
      return;
    }

    const post: ForumPost = {
      id: `post-${Date.now()}`,
      shopId: currentUser.shopId,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      title: newTitle.trim(),
      content: newContent.trim(),
      tag: newTag,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      replies: []
    };

    onAddPost(post);
    setShowPostModal(false);
    setNewTitle('');
    setNewContent('');
    onShowToast('Discussion note published to team forum.');
  };

  const handleSendReply = (postId: string) => {
    if (!replyText.trim()) return;
    onAddReply(postId, replyText.trim(), currentUser.name, currentUser.role);
    setReplyText('');
    setReplyingToId(null);
    onShowToast('Reply posted to thread.');
  };

  return (
    <div className="flex flex-col w-full space-y-4">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-4 shadow-xs border border-[#e5eeff] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0037b0] text-[22px]">
              forum
            </span>
            <h2 className="font-headline font-bold text-[18px] text-[#0b1c30]">
              Shop Discussion &amp; Team Forum
            </h2>
          </div>
          <p className="text-[12px] text-[#565e74] mt-0.5">
            Operational handover, floor alerts, and restock discussions shared across all shop roles.
          </p>
        </div>

        <button
          onClick={() => setShowPostModal(true)}
          className="px-3.5 py-2 rounded-lg bg-[#0037b0] hover:bg-[#1d4ed8] text-white text-[12px] font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">edit_note</span>
          <span>Post Note</span>
        </button>
      </div>

      {/* User Status Context */}
      <div className="p-3 bg-[#eff4ff] rounded-xl border border-[#dae2fd] text-[12px] text-[#0b1c30] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-[#0037b0]">account_circle</span>
          <span>
            Posting as <strong>{currentUser.name}</strong> ({currentUser.role}). All shop members participate here.
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {['All', 'Restock Flag', 'Floor Alert', 'Shift Note', 'General'].map((tag) => (
          <button
            key={tag}
            onClick={() => setFilterTag(tag)}
            className={`px-3 py-1 rounded-full text-[12px] font-semibold whitespace-nowrap transition-colors cursor-pointer border ${
              filterTag === tag
                ? 'bg-[#0037b0] text-white border-[#0037b0] shadow-xs'
                : 'bg-white text-[#565e74] border-[#dae2fd] hover:bg-[#eff4ff]'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Posts List or Empty State */}
      <div className="space-y-3">
        {filteredPosts.length === 0 ? (
          <div className="bg-white rounded-xl p-8 border border-[#e5eeff] text-center space-y-2">
            <span className="material-symbols-outlined text-[32px] text-[#565e74]">chat</span>
            <h3 className="font-headline font-bold text-[15px] text-[#0b1c30]">
              No Discussions Yet
            </h3>
            <p className="text-[12px] text-[#565e74] max-w-sm mx-auto">
              Be the first to post a team bulletin, restock notice, or handover note.
            </p>
            <button
              onClick={() => setShowPostModal(true)}
              className="mt-2 px-3 py-1.5 bg-[#eff4ff] hover:bg-[#dae2fd] text-[#0037b0] text-[12px] font-bold rounded-lg cursor-pointer"
            >
              Start First Discussion
            </button>
          </div>
        ) : (
          filteredPosts.map((post) => {
            let tagColor = 'bg-[#eff4ff] text-[#0037b0] border-[#dae2fd]';
            if (post.tag === 'Restock Flag') {
              tagColor = 'bg-[#ffdad6] text-[#ba1a1a] border-[#ffb4ab]';
            } else if (post.tag === 'Floor Alert') {
              tagColor = 'bg-[#dae2fd] text-[#3f465c] border-[#c4c5d7]';
            } else if (post.tag === 'Shift Note') {
              tagColor = 'bg-[#85f8c4] text-[#002114] border-[#68dba9]';
            }

            return (
              <div
                key={post.id}
                className="bg-white rounded-xl p-4 shadow-xs border border-[#e5eeff] space-y-3 hover:border-[#b7c4ff] transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#dce1ff] text-[#001551] flex items-center justify-center font-bold text-xs shrink-0 font-headline">
                      {getInitials(post.authorName)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-bold text-[#0b1c30]">
                          {post.authorName}
                        </span>
                        <span className="text-[10px] text-[#565e74] bg-[#eff4ff] px-1.5 py-0.2 rounded font-semibold">
                          {post.authorRole}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#565e74]">{post.timestamp}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tagColor}`}
                    >
                      {post.tag}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="font-headline font-semibold text-[14px] text-[#0b1c30]">
                    {post.title}
                  </h4>
                  <p className="text-[12px] text-[#434655] mt-1 leading-relaxed">
                    {post.content}
                  </p>
                </div>

                {/* Thread Replies */}
                {post.replies && post.replies.length > 0 && (
                  <div className="space-y-1.5 pl-3 border-l-2 border-[#eff4ff] pt-1">
                    {post.replies.map((rep) => (
                      <div
                        key={rep.id}
                        className="bg-[#eff4ff] p-2 rounded-lg text-[11px] text-[#0b1c30] space-y-0.5"
                      >
                        <div className="flex items-center justify-between text-[#565e74]">
                          <span className="font-bold text-[#0037b0]">
                            {rep.authorName} ({rep.authorRole})
                          </span>
                          <span>{rep.timestamp}</span>
                        </div>
                        <p>{rep.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Controls */}
                {replyingToId === post.id ? (
                  <div className="flex items-center gap-2 pt-2 border-t border-[#eff4ff]">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a reply..."
                      className="flex-1 bg-[#eff4ff] border border-[#dae2fd] px-2.5 py-1.5 rounded-lg text-[12px] text-[#0b1c30] outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSendReply(post.id)}
                      className="px-3 py-1.5 bg-[#0037b0] text-white rounded-lg text-[11px] font-bold cursor-pointer"
                    >
                      Send
                    </button>
                    <button
                      onClick={() => {
                        setReplyingToId(null);
                        setReplyText('');
                      }}
                      className="text-[11px] text-[#565e74] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-[#eff4ff] flex items-center justify-between text-[11px] text-[#565e74]">
                    <button
                      onClick={() => setReplyingToId(post.id)}
                      className="text-[11px] text-[#0037b0] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">reply</span>
                      <span>Reply to thread</span>
                    </button>
                    <span className="text-[#565e74]">
                      {(post.replies?.length || 0)}{' '}
                      {(post.replies?.length || 0) === 1 ? 'reply' : 'replies'}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* New Post Modal */}
      {showPostModal && (
        <div className="fixed inset-0 z-50 bg-[#213145]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-md border border-[#e5eeff] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#eff4ff]">
              <h3 className="font-headline font-semibold text-[16px] text-[#0b1c30]">
                Post Note to Team Forum
              </h3>
              <button
                onClick={() => setShowPostModal(false)}
                className="w-8 h-8 rounded-full bg-[#eff4ff] text-[#434655] flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#0b1c30]">Category Tag</label>
                <select
                  value={newTag}
                  onChange={(e) =>
                    setNewTag(
                      e.target.value as 'Restock Flag' | 'Floor Alert' | 'Shift Note' | 'General'
                    )
                  }
                  className="w-full bg-[#eff4ff] border border-[#dae2fd] p-2 rounded-lg text-[13px] outline-none"
                >
                  <option value="General">General (Team updates &amp; communication)</option>
                  <option value="Restock Flag">Restock Flag (Shelves low, restocking needed)</option>
                  <option value="Floor Alert">Floor Alert (Operational notice)</option>
                  <option value="Shift Note">Shift Note (Handover notes)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#0b1c30]">Topic Headline</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rice bags stock running low"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#eff4ff] border border-[#dae2fd] p-2 rounded-lg text-[13px] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#0b1c30]">Message</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe floor observations, notes, or requests..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full bg-[#eff4ff] border border-[#dae2fd] p-2 rounded-lg text-[13px] outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPostModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-[12px] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#0037b0] text-white text-[12px] font-bold shadow-xs hover:bg-[#1d4ed8] cursor-pointer"
                >
                  Publish Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
