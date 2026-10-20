// 하네스 로컬 ESLint 규칙이에요. AST 패턴이 필요한 규칙은 no-restricted-syntax 대신 여기에 둬요
// (no-restricted-syntax는 sonic-ui 디자인 규칙이 쓰고 있어서, 같이 켜면 서로 덮어써요).

const isIndexFile = (filename) => /[\\/]index\.tsx?$/.test(filename);

// slice의 public API(index.ts)로 Context를 내보내지 않아요.
// Context는 묶인 컴포넌트 내부 전달용이라, 밖에서는 그 컴포넌트만 써요.
const noContextExport = {
  meta: {
    type: 'problem',
    messages: {
      exported:
        '{{name}}을(를) index.ts로 내보내지 않아요. Context는 묶인 컴포넌트 내부 전달용이에요. 밖에는 컴포넌트만 내보내요.',
    },
    schema: [],
  },
  create(context) {
    if (!isIndexFile(context.filename)) return {};
    const check = (node, name) => {
      if (/Context$/.test(name))
        context.report({ node, messageId: 'exported', data: { name } });
    };
    return {
      ExportSpecifier(node) {
        check(node, node.exported.name ?? node.exported.value);
      },
      'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator'(
        node,
      ) {
        if (node.id.type === 'Identifier') check(node, node.id.name);
      },
    };
  },
};

// Zustand store는 selector로 필요한 값만 구독해요. 인자 없이 부르면 store 전체가 바뀔 때마다 다시 그려요.
const storeSelector = {
  meta: {
    type: 'problem',
    messages: {
      noSelector:
        '{{name}}()처럼 store 전체를 구독하지 않아요. {{name}}((s) => s.필요한값)처럼 selector로 필요한 값만 꺼내요.',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        const { callee } = node;
        if (
          callee.type === 'Identifier' &&
          /^use[A-Z]\w*Store$/.test(callee.name) &&
          node.arguments.length === 0
        )
          context.report({
            node,
            messageId: 'noSelector',
            data: { name: callee.name },
          });
      },
    };
  },
};

// 테스트: 요소는 역할·라벨·글자로 찾아요. data-testid는 사용자가 보지 않는 값이라 쓰지 않아요.
const noTestId = {
  meta: {
    type: 'problem',
    messages: {
      testId:
        '{{name}}는 쓰지 않아요. getByRole → getByLabelText → getByText 순서로, 사용자가 보는 것으로 찾아요.',
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        const { callee } = node;
        const name =
          callee.type === 'MemberExpression'
            ? callee.property.name
            : callee.name;
        if (/^(get|query|find)(All)?ByTestId$/.test(name ?? ''))
          context.report({ node, messageId: 'testId', data: { name } });
      },
    };
  },
};

// 테스트: 프로젝트 모듈을 vi.mock으로 바꾸지 않아요. 서버 응답은 MSW(server.use)로 바꿔요.
const noInternalMock = {
  meta: {
    type: 'problem',
    messages: {
      internal:
        "프로젝트 모듈('{{path}}')을 vi.mock으로 바꾸지 않아요. 서버 응답은 server.use(http.get(...))로 바꾸고, 나머지는 실제 코드로 테스트해요.",
    },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node) {
        const { callee } = node;
        const [first] = node.arguments;
        if (
          callee.type === 'MemberExpression' &&
          callee.object.name === 'vi' &&
          ['mock', 'doMock'].includes(callee.property.name) &&
          first?.type === 'Literal' &&
          /^(@\/|\.)/.test(first.value)
        )
          context.report({
            node,
            messageId: 'internal',
            data: { path: first.value },
          });
      },
    };
  },
};

export default {
  meta: { name: 'sonic' },
  rules: {
    'no-context-export': noContextExport,
    'store-selector': storeSelector,
    'no-test-id': noTestId,
    'no-internal-mock': noInternalMock,
  },
};
