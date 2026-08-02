import test from 'node:test';
import assert from 'node:assert/strict';
import { CommentService } from '../modules/comment_service.ts';

test('CommentService.formatForClipboard correctly formats author and comment text', () => {
    assert.equal(
        CommentService.formatForClipboard('@JohnDoe', 'Hello World'),
        '@JohnDoe\n\nHello World'
    );
    assert.equal(
        CommentService.formatForClipboard('Jane', 'Testing'),
        '@Jane\n\nTesting'
    );
    assert.equal(
        CommentService.formatForClipboard('', 'Anonymous comment'),
        'Anonymous comment'
    );
});