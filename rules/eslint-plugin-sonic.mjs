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

export default {
  meta: { name: 'sonic' },
  rules: {
    'no-context-export': noContextExport,
    'store-selector': storeSelector,
  },
};
