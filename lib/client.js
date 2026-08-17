window.__ModuleLoader__.load({
	id: "dsh-plugin-task-panel",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let React = require("react");
		let h = React.createElement;

		const listeners = new Set();
		let state = {
			open: true,
			geometry: null,
			contextTab: 'file',
			fileFilter: 'output',
			sessionId: '',
			cwd: '',
			todos: [],
			goal: null,
			pressure: null,
			breakdown: null,
			usage: null,
			files: [],
			tools: []
		};

		function get() { return state; }
		function set(patch) {
			state = Object.assign({}, state, patch);
			listeners.forEach((fn) => fn(state));
		}
		function listen(fn) {
			listeners.add(fn);
			return () => { listeners.delete(fn); };
		}
		function useStore() {
			const pair = React.useState(get);
			React.useEffect(() => listen(pair[1]), []);
			return pair[0];
		}
		function equal(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
		function fmt(value) {
			if (typeof value !== 'number') return '0';
			if (value < 1000) return String(Math.round(value));
			if (value < 1000000) return String(Math.round(value / 100) / 10) + 'K';
			return String(Math.round(value / 100000) / 10) + 'M';
		}
		function base(path) {
			const parts = String(path || '').split(/[\\/]/);
			return parts[parts.length - 1] || path;
		}
		function dir(path) {
			const name = base(path);
			return String(path || '').slice(0, Math.max(0, String(path || '').length - name.length)).replace(/[\\/]$/, '');
		}
		function tone(path) {
			const name = base(path), dot = name.lastIndexOf('.'), ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
			if (['js','jsx','ts','tsx','json'].indexOf(ext) >= 0) return 'yellow';
			if (['md','txt','rst'].indexOf(ext) >= 0) return 'blue';
			if (['css','scss','html','vue'].indexOf(ext) >= 0) return 'purple';
			if (['png','jpg','jpeg','gif','webp','svg'].indexOf(ext) >= 0) return 'pink';
			if (['py','go','rs','java','c','cpp'].indexOf(ext) >= 0) return 'green';
			return 'gray';
		}
		function projectTodos(value) {
			return Array.isArray(value) ? value.map((x) => ({ content: x && typeof x.content === 'string' ? x.content : '', status: x && typeof x.status === 'string' ? x.status : 'pending' })) : [];
		}
		function projectGoal(value) {
			const x = value && value.goal;
			return x ? { objective: typeof x.objective === 'string' ? x.objective : '', phase: typeof x.phase === 'string' ? x.phase : '' } : null;
		}
		function projectPressure(value) {
			if (!value) return null;
			const used = value.projectedTokens != null ? value.projectedTokens : value.pressureTokens;
			return typeof used === 'number' && typeof value.contextWindow === 'number' && value.contextWindow > 0 ? { used: used, window: value.contextWindow, percent: Math.min(100, Math.round(used / value.contextWindow * 100)) } : null;
		}
		function projectBreakdown(value) {
			if (!value) return null;
			const x = { system: Number(value.systemTokens) || 0, tools: Number(value.toolsTokens) || 0, messages: Number(value.messageTokens) || 0 };
			return x.system + x.tools + x.messages > 0 ? x : null;
		}
		function projectUsage(value) {
			return value ? { uncached: Number(value.uncachedInputTokens) || 0, read: Number(value.cacheReadTokens) || 0, write: Number(value.cacheWriteTokens) || 0, output: Number(value.outputTokens) || 0 } : null;
		}
		function pickPath(args) {
			if (!args || typeof args !== 'object') return '';
			if (typeof args.file_path === 'string' && args.file_path.trim()) return args.file_path.trim();
			if (typeof args.path === 'string' && args.path.trim()) return args.path.trim();
			return '';
		}
		function categoryOf(name) {
			if (name === 'write' || name === 'edit') return 'output';
			if (name === 'read' || name === 'read_image' || name === 'grep' || name === 'glob') return 'read';
			return '';
		}
		function collect(nodes, running, partial) {
			const files = [], tools = [], fileAt = Object.create(null), toolAt = Object.create(null);
			const rank = { read: 1, output: 2 };
			function add(path, category) {
				if (typeof path !== 'string' || !path.trim() || !category) return;
				path = path.trim();
				const name = base(path);
				if (name.indexOf('.task-panel-') === 0 && name.indexOf('.tmp.js') > 0) return;
				if (fileAt[path] !== undefined) {
					const old = files[fileAt[path]];
					if (rank[category] > rank[old.category]) old.category = category;
					return;
				}
				fileAt[path] = files.length;
				files.push({ path: path, name: name, dir: dir(path), tone: tone(path), category: category });
			}
			function useTool(name, raw, live) {
				if (typeof name !== 'string' || !name) return;
				if (toolAt[name] === undefined) {
					toolAt[name] = tools.length;
					tools.push({ name: name, live: live });
				} else if (live) {
					tools[toolAt[name]].live = true;
				}
				const category = categoryOf(name);
				if (category && typeof raw === 'string' && raw) {
					try {
						const args = JSON.parse(raw);
						const path = pickPath(args);
						if (path) add(path, category);
					} catch (error) {}
				}
			}
			function walk(item, live) {
				if (!item || typeof item !== 'object') return;
				if (item.kind === 'assistant' && Array.isArray(item.blocks)) {
					item.blocks.forEach((block) => walk(block, live));
					return;
				}
				if (item.kind === 'tool-call') {
					useTool(item.name, item.argsRaw, live);
					return;
				}
				if (item.call && item.call.name) useTool(item.call.name, item.call.argsRaw, live);
				else if (item.name && (item.argsRaw !== undefined || item.call)) useTool(item.name, item.argsRaw, live);
				const view = item.callView || (item.call && item.call.callView);
				if (view && Array.isArray(view.diffs)) {
					view.diffs.forEach((diff) => {
						if (diff && diff.path) add(diff.path, 'output');
					});
				}
				if (Array.isArray(item.subCalls)) item.subCalls.forEach((x) => walk(x, live));
			}
			if (Array.isArray(nodes)) nodes.forEach((x) => walk(x, false));
			if (Array.isArray(running)) running.forEach((x) => walk(x, true));
			if (partial && Array.isArray(partial.blocks)) partial.blocks.forEach((x) => walk(x, true));
			return { files: files, tools: tools };
		}
		function screenBox() {
			const s = typeof screen !== 'undefined' ? screen : null;
			const left = s && typeof s.availLeft === 'number' ? s.availLeft : 0;
			const top = s && typeof s.availTop === 'number' ? s.availTop : 0;
			const aw = s && s.availWidth ? s.availWidth : (typeof window !== 'undefined' ? window.innerWidth : 1920);
			const ah = s && s.availHeight ? s.availHeight : (typeof window !== 'undefined' ? window.innerHeight : 1080);
			return { left: left, top: top, right: left + aw, bottom: top + ah };
		}
		function clampToScreen(x, y, w, height) {
			const box = screenBox();
			const keep = 48;
			w = Math.max(300, w);
			height = Math.max(280, height);
			x = Math.min(Math.max(x, box.left + keep - w), box.right - keep);
			y = Math.min(Math.max(y, box.top), box.bottom - keep);
			return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(height) };
		}
		function isInteractive(target) {
			if (!target || !target.closest) return false;
			return !!target.closest('button, input, textarea, a, .tp-handle');
		}
		function startMotion(event, mode, onTap) {
			if (event.button !== 0 || typeof document === 'undefined') return;
			if (mode === 'move' && !onTap && isInteractive(event.target)) return;
			event.preventDefault();
			event.stopPropagation();
			const panel = event.currentTarget.closest ? event.currentTarget.closest('.tp-panel') : null;
			if (!panel) return;
			const rect = panel.getBoundingClientRect(), sx = event.clientX, sy = event.clientY;
			let dragging = !onTap;
			if (event.currentTarget.setPointerCapture) {
				try { event.currentTarget.setPointerCapture(event.pointerId); } catch (error) {}
			}
			function move(e) {
				const dx = e.clientX - sx, dy = e.clientY - sy;
				if (!dragging) {
					if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
					dragging = true;
				}
				let x = rect.left, y = rect.top, w = rect.width, height = rect.height;
				if (mode === 'move') {
					x += dx;
					y += dy;
				} else {
					if (mode.indexOf('e') >= 0) w += dx;
					if (mode.indexOf('s') >= 0) height += dy;
					if (mode.indexOf('w') >= 0) { x += dx; w -= dx; }
					if (mode.indexOf('n') >= 0) { y += dy; height -= dy; }
				}
				if (w < 300) {
					if (mode.indexOf('w') >= 0) x -= 300 - w;
					w = 300;
				}
				if (height < 280) {
					if (mode.indexOf('n') >= 0) y -= 280 - height;
					height = 280;
				}
				set({ geometry: clampToScreen(x, y, w, height) });
			}
			function stop() {
				document.removeEventListener('pointermove', move);
				document.removeEventListener('pointerup', stop);
				document.removeEventListener('pointercancel', stop);
				if (!dragging && typeof onTap === 'function') onTap();
			}
			document.addEventListener('pointermove', move);
			document.addEventListener('pointerup', stop);
			document.addEventListener('pointercancel', stop);
		}
		function fileIcon(file) {
			return h('span', { className: 'tp-fileicon tp-tone-' + file.tone }, h('svg', { viewBox: '0 0 16 16', width: 16, height: 16, fill: 'none' }, h('path', { d: 'M4 1.8h5l3 3v9.4H4z', stroke: 'currentColor', strokeWidth: 1.2, strokeLinejoin: 'round' }), h('path', { d: 'M9 1.8v3h3', stroke: 'currentColor', strokeWidth: 1.2 })));
		}

		function inject(ctx) {
			const sessions = ctx.get('sessions');
			const workspaces = ctx.get('workspaces');

			function compact() {
				const binding = sessions !== undefined && state.sessionId ? sessions.binding(state.sessionId) : undefined;
				if (binding && binding.session) binding.session.command('/compact').catch(() => {});
			}
			function openFile(path) {
				if (workspaces !== undefined) workspaces.openPath(path).catch(() => {});
			}

			function Header(props) {
				const id = props.sessionId;
				const todos = props.useProjection('todos');
				const goal = props.useProjection('goal');
				const pressure = props.useProjection('contextPressure');
				const breakdown = props.useProjection('contextBreakdown');
				const usage = props.useProjection('tokenUsage');
				const nodes = props.useSession((s) => s && s.chat && s.chat.legacy ? s.chat.legacy.nodes : null);
				const running = props.useSession((s) => s && s.chat && s.chat.legacy ? s.chat.legacy.runningCalls : null);
				const partial = props.useSession((s) => s && s.chat && s.chat.legacy ? s.chat.legacy.partial : null);
				const cwd = props.useSessions((s) => s && s.byId && s.byId[id] ? s.byId[id].cwd : '');
				const pair = React.useState(get().open);
				React.useEffect(() => listen((next) => pair[1](next.open)), []);
				React.useEffect(() => {
					const found = collect(nodes, running, partial);
					const next = {
						sessionId: id || '',
						cwd: cwd || '',
						todos: projectTodos(todos),
						goal: projectGoal(goal),
						pressure: projectPressure(pressure),
						breakdown: projectBreakdown(breakdown),
						usage: projectUsage(usage),
						files: found.files,
						tools: found.tools
					};
					const prev = get();
					if (prev.sessionId !== next.sessionId || prev.cwd !== next.cwd || !equal(prev.todos, next.todos) || !equal(prev.goal, next.goal) || !equal(prev.pressure, next.pressure) || !equal(prev.breakdown, next.breakdown) || !equal(prev.usage, next.usage) || !equal(prev.files, next.files) || !equal(prev.tools, next.tools)) {
						set(next);
					}
				});
				return h('button', {
					type: 'button',
					className: 'tp-toggle' + (pair[0] ? ' tp-toggle-on' : ''),
					title: '任务面板 Ctrl+Alt+B',
					onClick: () => set({ open: !get().open })
				}, h('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none' }, h('rect', { x: 2.5, y: 2.5, width: 11, height: 11, rx: 2, stroke: 'currentColor', strokeWidth: 1.4 }), h('path', { d: 'M10 3v10', stroke: 'currentColor', strokeWidth: 1.4 })));
			}

			function ContextSection(props) {
				const p = props.pressure, b = props.breakdown, u = props.usage;
				const tab = props.contextTab || 'file';
				const filter = props.fileFilter === 'read' ? 'read' : 'output';
				const outputCount = props.files.filter((f) => f.category === 'output').length;
				const readCount = props.files.filter((f) => f.category === 'read').length;
				const rows = props.files.filter((f) => f.category === filter);

				if (!p) return h('div', { className: 'tp-empty' }, '暂未使用上下文');
				const system = b ? b.system / p.window * 100 : 0, tools = b ? b.tools / p.window * 100 : 0, messages = b ? b.messages / p.window * 100 : p.percent;
				const fileTokens = b ? b.messages : p.used;
				const otherTokens = b ? Math.max(0, b.system + b.tools) : 0;
				const filePercent = p.window > 0 ? Math.min(100, Math.round(fileTokens / p.window * 100)) : p.percent;
				const otherPercent = p.window > 0 ? Math.min(100, Math.round(otherTokens / p.window * 100)) : 0;

				const bar = h('div', { className: 'tp-contextline' },
					h('div', { className: 'tp-bar' },
						b ? h('i', { className: 'tp-seg tp-system', style: { width: system + '%' } }) : null,
						b ? h('i', { className: 'tp-seg tp-tools', style: { width: tools + '%' } }) : null,
						h('i', { className: 'tp-seg tp-messages', style: { width: messages + '%' } }),
						h('i', { className: 'tp-free' })
					),
					h('b', { className: 'tp-percent' }, p.percent + '%')
				);

				const mainTabs = h('div', { className: 'tp-maintabs' },
					h('button', {
						type: 'button',
						className: 'tp-maintab' + (tab === 'file' ? ' tp-maintab-on' : ''),
						onClick: () => set({ contextTab: 'file' })
					},
						h('i', { className: 'tp-sq tp-sq-file' }),
						h('span', { className: 'tp-tabtxt' }, '文件'),
						h('span', { className: 'tp-tabstat' }, fmt(fileTokens) + ' · ' + filePercent + '%')
					),
					h('button', {
						type: 'button',
						className: 'tp-maintab' + (tab === 'other' ? ' tp-maintab-on' : ''),
						onClick: () => set({ contextTab: 'other' })
					},
						h('i', { className: 'tp-sq tp-sq-other' }),
						h('span', { className: 'tp-tabtxt' }, '其他'),
						h('span', { className: 'tp-tabstat' }, fmt(otherTokens) + ' · ' + otherPercent + '%')
					)
				);

				let tabContent = null;
				if (tab === 'file') {
					const subTabs = h('div', { className: 'tp-subtabs' },
						h('button', {
							type: 'button',
							className: 'tp-subtab' + (filter === 'output' ? ' tp-subtab-on' : ''),
							onClick: () => set({ fileFilter: 'output' })
						}, '输出 (' + outputCount + ')'),
						h('button', {
							type: 'button',
							className: 'tp-subtab' + (filter === 'read' ? ' tp-subtab-on' : ''),
							onClick: () => set({ fileFilter: 'read' })
						}, '读取 (' + readCount + ')')
					);
					const fileList = rows.map((file) => {
						const text = h('span', { className: 'tp-filetext' }, h('span', { className: 'tp-filename' }, file.name), file.dir ? h('span', { className: 'tp-filedir' }, file.dir) : null);
						return h('button', { type: 'button', className: 'tp-file', key: file.path, title: file.path, onClick: () => openFile(file.path) }, fileIcon(file), text);
					});
					tabContent = h('div', null,
						subTabs,
						!props.files.length ? h('div', { className: 'tp-empty' }, '本会话尚无文件记录') : (!rows.length ? h('div', { className: 'tp-empty' }, filter === 'output' ? '暂无输出文件' : '暂无读取文件') : fileList)
					);
				} else {
					const input = u ? u.uncached + u.read + u.write : 0, hit = u && input ? Math.round(u.read / input * 100) : 0;
					tabContent = h('div', { className: 'tp-otherbox' },
						h('div', { className: 'tp-othertitle' }, '其他上下文'),
						h('div', { className: 'tp-otherdesc' }, '用于系统级指令、工具协议和后台处理的上下文'),
						h('div', { className: 'tp-otherlist' },
							h('div', { className: 'tp-otherrow' },
								h('span', { className: 'tp-othername' }, h('i', { className: 'tp-dot tp-system' }), '系统级指令 (System Prompt)'),
								h('span', { className: 'tp-otherval' }, b ? fmt(b.system) + ' tokens' : '0')
							),
							h('div', { className: 'tp-otherrow' },
								h('span', { className: 'tp-othername' }, h('i', { className: 'tp-dot tp-tools' }), '工具定义与协议 (Tools Schema)'),
								h('span', { className: 'tp-otherval' }, b ? fmt(b.tools) + ' tokens' : '0')
							),
							u ? h('div', { className: 'tp-cache' },
								[['缓存读取', fmt(u.read) + ' · ' + hit + '%'], ['缓存写入', fmt(u.write)], ['未缓存输入', fmt(u.uncached)], ['模型输出', fmt(u.output)]].map((x) => h('div', { className: 'tp-stat', key: x[0] }, h('div', { className: 'tp-statlabel' }, x[0]), h('div', { className: 'tp-statvalue' }, x[1])))
							) : null
						)
					);
				}

				return h('div', null, bar, mainTabs, tabContent);
			}

			function Summary(props) {
				const todo = props.todos.length ? props.todos.map((x, i) => h('div', { className: 'tp-todo', 'data-status': x.status, key: x.content + i }, h('span', null, x.status === 'completed' ? '✓' : x.status === 'in_progress' ? '◐' : '○'), h('span', null, x.content))) : h('div', { className: 'tp-emptycard' }, h('div', { className: 'tp-emptyglyph' }, '☷'), h('div', { className: 'tp-emptytitle' }, '暂无待办'), h('div', null, '复杂任务的进展会显示在这里'));
				const goal = props.goal ? h('section', { className: 'tp-section' }, h('div', { className: 'tp-k' }, '当前目标'), h('div', { className: 'tp-phase' }, props.goal.phase === 'active' ? '进行中' : props.goal.phase), h('div', null, props.goal.objective)) : null;
				const tools = props.tools.length ? h('section', { className: 'tp-section' }, h('div', { className: 'tp-k' }, '工具'), h('div', { className: 'tp-chiprow' }, props.tools.map((x) => h('span', { className: 'tp-chip', key: x.name }, x.name, x.live ? h('em', null, '进行中') : null)))) : null;
				return h('div', null,
					h('section', { className: 'tp-section' }, h('div', { className: 'tp-k' }, '待办'), todo),
					goal,
					h('div', { className: 'tp-divider' }),
					h('section', { className: 'tp-section' },
						h('div', { className: 'tp-k' }, h('span', null, '上下文'), h('button', { type: 'button', className: 'tp-compact', onClick: compact }, '压缩')),
						h(ContextSection, props)
					),
					tools
				);
			}

			function Panel() {
				const s = useStore();
				if (!s.open) return null;
				const g = s.geometry, style = g ? { left: g.x + 'px', top: g.y + 'px', right: 'auto', width: g.w + 'px', height: g.h + 'px' } : null;
				const handles = ['n','s','e','w','ne','nw','se','sw'].map((mode) => h('i', { className: 'tp-handle tp-' + mode, key: mode, onPointerDown: (e) => startMotion(e, mode) }));
				const header = h('header', { className: 'tp-head', onPointerDown: (e) => startMotion(e, 'move') },
					h('div', { className: 'tp-drag' }, h('span', { className: 'tp-title' }, '☷ 任务摘要')),
					h('button', { className: 'tp-iconbtn', title: '恢复默认大小和位置', onPointerDown: (e) => e.stopPropagation(), onClick: () => set({ geometry: null }) }, '↙'),
					h('button', { className: 'tp-iconbtn', onPointerDown: (e) => e.stopPropagation(), onClick: () => set({ open: false }) }, '×')
				);
				return h('div', { className: 'tp-shell', style: style }, h('div', { className: 'tp-panel' }, handles, header, h('main', { className: 'tp-body' }, h(Summary, s)), h('i', { className: 'tp-grip' })));
			}

			return { Header, Panel };
		}

		const tagId = "dsh-plugin-task-panel/style";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-plugin-task-panel";
			tag.dataset.pluginCss = tagId;
			tag.textContent = [
				'.tp-toggle{width:30px;height:30px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-tertiary);display:grid;place-items:center;cursor:pointer}.tp-toggle:hover,.tp-toggle-on{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
				'.tp-shell{position:fixed;top:56px;right:12px;width:420px;height:calc(100vh - 68px);z-index:40;pointer-events:none}.tp-panel{position:relative;width:100%;height:100%;box-sizing:border-box;pointer-events:auto;display:flex;flex-direction:column;border:1px solid var(--dsw-alias-border-l1);border-radius:16px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);box-shadow:0 14px 44px rgba(0,0,0,.18);overflow:hidden}',
				'.tp-head{height:54px;box-sizing:border-box;display:flex;align-items:center;gap:7px;padding:8px 14px;border-bottom:1px solid var(--dsw-alias-border-l1);user-select:none;cursor:grab;touch-action:none}.tp-head:active{cursor:grabbing}.tp-drag{min-width:0;flex:1;display:flex;align-items:center;cursor:grab}.tp-title{font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary)}',
				'.tp-iconbtn{width:30px;height:30px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-tertiary);font-size:16px;cursor:pointer}.tp-iconbtn:hover{background:var(--dsw-alias-interactive-bg-hover)}',
				'.tp-body{min-height:0;flex:1;overflow:auto;padding:18px 20px 24px}.tp-section{margin:0 0 22px}.tp-divider{height:1px;background:var(--dsw-alias-border-l1);margin:22px 0}.tp-k{display:flex;align-items:center;justify-content:space-between;color:var(--dsw-alias-label-secondary);font-size:14px;margin-bottom:11px}.tp-empty{color:var(--dsw-alias-label-tertiary);font-size:13px;margin-top:10px}.tp-emptycard{text-align:center;padding:22px 8px;color:var(--dsw-alias-label-tertiary)}.tp-emptyglyph{width:42px;height:42px;border:1px solid var(--dsw-alias-border-l1);border-radius:12px;margin:0 auto 12px;display:grid;place-items:center}.tp-emptytitle{color:var(--dsw-alias-label-primary);font-size:14px;margin-bottom:4px}',
				'.tp-todo{display:flex;gap:9px;margin-bottom:9px;font-size:13px}.tp-todo[data-status="completed"]{color:var(--dsw-alias-label-tertiary);text-decoration:line-through}.tp-phase{color:var(--dsw-alias-label-tertiary);font-size:12px;margin-bottom:4px}.tp-compact{border:0;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);border-radius:9px;padding:5px 13px;cursor:pointer}',
				'.tp-contextline{display:flex;align-items:center;gap:10px}.tp-bar{height:7px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;display:flex;overflow:hidden;flex:1}.tp-seg{height:100%;min-width:1px}.tp-system{background:#a8d8f0}.tp-tools{background:#a78bfa}.tp-messages{background:#6ca8ff}.tp-free{background:var(--dsw-alias-interactive-bg-hover);flex:1}.tp-percent{font-size:13px;min-width:34px;text-align:right}',
				'.tp-maintabs{display:flex;align-items:center;gap:18px;margin:14px 0 10px;border-bottom:1px solid var(--dsw-alias-border-l1);padding-bottom:2px}',
				'.tp-maintab{border:0;background:transparent;color:var(--dsw-alias-label-tertiary);padding:0 0 6px;font-size:13px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;box-shadow:inset 0 -2px 0 transparent}.tp-maintab-on{color:var(--dsw-alias-label-primary);font-weight:600;box-shadow:inset 0 -2px 0 currentColor}',
				'.tp-tabtxt{font-size:13px}',
				'.tp-tabstat{font-size:11px;color:var(--dsw-alias-label-tertiary);margin-left:2px;font-variant-numeric:tabular-nums}',
				'.tp-maintab-on .tp-tabstat{color:var(--dsw-alias-label-secondary)}',
				'.tp-sq{width:8px;height:8px;border-radius:2px;display:inline-block}.tp-sq-file{background:#7eb6ff}.tp-sq-other{background:#a78bfa}',
				'.tp-subtabs{display:flex;align-items:center;gap:12px;margin:6px 0 10px}',
				'.tp-subtab{border:0;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);padding:4px 10px;border-radius:6px;font-size:12px;cursor:pointer}.tp-subtab-on{background:var(--dsw-alias-fill-l2);color:var(--dsw-alias-label-primary);font-weight:600}',
				'.tp-otherbox{padding:14px 4px 6px;text-align:center}',
				'.tp-othertitle{font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary);margin-bottom:6px}',
				'.tp-otherdesc{font-size:12px;color:var(--dsw-alias-label-tertiary);margin-bottom:16px}',
				'.tp-otherlist{text-align:left;display:flex;flex-direction:column;gap:9px}',
				'.tp-otherrow{display:flex;align-items:center;justify-content:space-between;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:8px 12px;font-size:12px}',
				'.tp-othername{display:flex;align-items:center;gap:7px;color:var(--dsw-alias-label-secondary)}',
				'.tp-otherval{color:var(--dsw-alias-label-primary);font-weight:600;font-variant-numeric:tabular-nums}',
				'.tp-dot{width:8px;height:8px;border-radius:2px;display:inline-block}.tp-dot.tp-system{background:#a8d8f0}.tp-dot.tp-tools{background:#a78bfa}.tp-dot.tp-messages{background:#6ca8ff}',
				'.tp-cache{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:10px}',
				'.tp-stat{border:1px solid var(--dsw-alias-border-l1);border-radius:9px;padding:7px 9px}',
				'.tp-statlabel{font-size:11px;color:var(--dsw-alias-label-tertiary)}.tp-statvalue{font-size:13px;margin-top:2px}',
				'.tp-file{width:100%;box-sizing:border-box;border:0;background:transparent;color:var(--dsw-alias-label-primary);border-radius:9px;padding:7px;display:flex;align-items:center;gap:9px;text-align:left;cursor:pointer}.tp-file:hover{background:var(--dsw-alias-interactive-bg-hover)}.tp-fileicon{display:grid;flex:none}.tp-tone-yellow{color:#d69e2e}.tp-tone-blue{color:#42a5f5}.tp-tone-purple{color:#8b7cf6}.tp-tone-pink{color:#e06cae}.tp-tone-green{color:#39a96b}.tp-tone-gray{color:var(--dsw-alias-label-tertiary)}.tp-filetext{display:flex;flex-direction:column;min-width:0;flex:1}.tp-filename,.tp-filedir{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tp-filename{font-size:13px}.tp-filedir{font-size:11px;color:var(--dsw-alias-label-tertiary)}.tp-chiprow{display:flex;flex-wrap:wrap;gap:6px}.tp-chip{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:4px 7px;font-size:11px;color:var(--dsw-alias-label-secondary)}.tp-chip em{color:#2eae67;font-style:normal;margin-left:5px}',
				'.tp-handle{position:absolute;z-index:6;touch-action:none}.tp-n{top:-3px;left:12px;right:12px;height:7px;cursor:n-resize}.tp-s{bottom:-3px;left:12px;right:12px;height:7px;cursor:s-resize}.tp-e{right:-3px;top:12px;bottom:12px;width:7px;cursor:e-resize}.tp-w{left:-3px;top:12px;bottom:12px;width:7px;cursor:w-resize}.tp-ne,.tp-nw,.tp-se,.tp-sw{width:14px;height:14px}.tp-ne{right:-4px;top:-4px;cursor:ne-resize}.tp-nw{left:-4px;top:-4px;cursor:nw-resize}.tp-se{right:-4px;bottom:-4px;cursor:se-resize}.tp-sw{left:-4px;bottom:-4px;cursor:sw-resize}.tp-grip{position:absolute;right:3px;bottom:3px;width:9px;height:9px;pointer-events:none;border-right:2px solid var(--dsw-alias-border-l2);border-bottom:2px solid var(--dsw-alias-border-l2)}'
			].join('');
			document.head.appendChild(tag);
		}

		const injectList = [
			"slots",
			"sessions",
			"workspaces"
		];

		function apply(ctx) {
			ctx.effect(() => {
				if (typeof document === 'undefined') return;
				function key(e) {
					if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'b' || e.key === 'B')) {
						e.preventDefault();
						set({ open: !get().open });
					}
				}
				document.addEventListener('keydown', key);
				return () => document.removeEventListener('keydown', key);
			});

			ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.inject('shell.overlay', function* () {
				yield ctx.slots.register({
					name: 'conversation.session.header.utilities',
					id: 'task-panel-toggle',
					order: 40,
					label: '任务面板',
					inject: () => inject(ctx)
				}, (props) => props.Header(props));

				yield ctx.slots.register({
					name: 'shell.overlay',
					id: 'task-panel-overlay',
					order: 80,
					label: '任务摘要',
					inject: () => inject(ctx)
				}, (props) => props.Panel(props));
			}));
		}

		exports.apply = apply;
		exports.inject = injectList;
		return module.exports;
	}
});
