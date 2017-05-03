/* global preact, Immutable, showdown, console */

const h = preact.h;
const { List, Set } = Immutable;

const markdownToHtml = (text) => {
  const converter = new showdown.Converter();
  return converter.makeHtml(text);
}

// UI Elements //////////////////////////////////////////////////////////////

const IconButton = props => {
  let alt = props.title || props.alt;
  let span = props.title ? h('span', null, props.title) : null;
  return h('button', { onClick: props.onClick, title: alt }, h('i', { className: 'fa ' + props.icon }), span);
};

// Header ///////////////////////////////////////////////////////////////////

const Header = props =>
  h('header', { className: 'header'},
    h('div', { className: 'header__logo' }, 'dlite'),
    h('div', { className: 'header__title' }, props.title),
    h('div', { className: 'header__nav' }, 'Frederik')
  );

// Components ///////////////////////////////////////////////////////////////////

const Guide = props =>
  h('div', { className: 'guide', dangerouslySetInnerHTML: {__html: markdownToHtml(props.guideText)} });

class Editor extends preact.Component {
  constructor(props) {
    super();
  }

  onKeyPress(e) {
    if (e.keyCode === 13 && e.ctrlKey && e.shiftKey) {
      gApp.runScript();
      return false;
    }
  }

  onInput(e) {
    gApp.setEditorText(e.target.value);
  }

  render(props, state) {
    return h('div', { className: 'editor'},
      h('textarea', { className: 'editor__area', onKeyPress: this.onKeyPress.bind(this), onInput: this.onInput.bind(this) }, props.editorText),
      h('div', { className: 'editor__actions'},
        h('button', { className: 'editor__run', onClick: gApp.runScript.bind(gApp), title: 'Shortcut: Ctrl-Shift-Return'}, 'Run')
      )
    );
  }
}

const ConsoleMessage = props =>
  h('div', { className: 'console__message' }, props.message);

class ConsoleEntry extends preact.Component {
  constructor(props) {
    super();
    this.state.text = '';
  }

  onKeyPress(e) {
    if (e.keyCode === 13) {
      gApp.pushMessage(this.state.text);
      gApp.executeConsole(this.state.text);
      this.setState({text: ''});
      this.base.focus();
    }
  }

  onInput(e) {
    this.setState({text: e.target.value});
  }

  render(props, state) {
    return h('div', { className: 'console__entry' },
      h('input', { type: 'text', className: 'console__input', placeholder: '>>>', value: state.text, onKeyPress: this.onKeyPress.bind(this), onInput: this.onInput.bind(this)})
    );
  }
}

const Console = props =>
  h('div', { className: 'console'},
    props.messages.map(msg => h(ConsoleMessage, { message: msg })).toArray(),
    h(ConsoleEntry, {})
  );

const Dojo = props =>
  h('div', { className: 'dojo'},
    h(Editor, { editorText: props.editorText }),
    h(Console, { messages: props.messages })
  );

const MainPanel = props =>
  h('main', {},
    h(Guide, { guideText: props.guideText }),
    h(Dojo, { editorText: props.editorText, messages: props.messages })
  )

const SolvedModal = props =>
  h('div', {className: 'solved'},
    h('h2', {className: 'solved__header'}, 'Well done!'),
    h('div', {className: 'solved__recap'}, props.section.recap),
    h('button', {className: 'solved__next', onClick: gApp.nextSection.bind(gApp)}, 'Next')
  );

// App ///////////////////////////////////////////////////////////////////

class App extends preact.Component {
  constructor(props) {
    super();
    window.gApp = this;
    this.state.solved = false;
    this.state.chapterIndex = 0;
    this.state.sectionIndex = 0;
    this.state.messages = List();

    this.state.chapter = props.course.chapters[this.state.chapterIndex];
    this.state.section = this.state.chapter.sections[this.state.sectionIndex];

    this.state.guideText = this.state.section.guide;
    this.state.editorText = this.state.section.code;

    this.socket = new WebSocket("ws://localhost:3000");
    this.socket.onmessage = this.onSocketMessage.bind(this);

  }

  onSocketMessage(event) {
    console.log(event.data);
    let lines = event.data.split('\n');
    lines = lines.filter(l => (!l.startsWith('>>>')) && (!l.startsWith('...')));
    if (lines.length > 0) {
      this.pushMessage(lines.join('\n'));
      const re = new RegExp(this.state.section.expected_code)
      const result = lines.find(l => l.trim() == this.state.section.expected_result);
      if (result) {
        console.log('result contains expected');
        if (this.state.editorText.indexOf(this.state.section.expected_code) >= 0) {
          this.state.solved = true;
          console.log('code contains expected');
        }
      }
    }
  }

  pushMessage(msg) {
    console.log(this.state.messages.push(msg));
    this.setState({messages: this.state.messages.push(msg)});
  }

  setEditorText(text) {
   this.setState({editorText: text});
  }

  executeConsole(text) {
    this.socket.send('C' + text);
  }

  runScript() {
    this.socket.send('S' + this.state.editorText);
  }

  nextSection() {
    console.log('next section');
    this.setState({solved: false});
  }

  render(props, state) {
    const solvedModal = this.state.solved ? h(SolvedModal, { section: this.state.section }) : undefined;

    return h('div', { className: 'app' },
      h(Header, { title: props.course.title }),
      h(MainPanel, { guideText: this.state.guideText, editorText: this.state.editorText, messages: state.messages}),
      solvedModal
    );
  }
}

fetch('/api/courses/python-101').then(res => res.json()).then(json => {
  preact.render(h(App, { course: json }), document.body);
})

