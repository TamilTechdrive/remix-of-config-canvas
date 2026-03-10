import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ===== PARSER SESSIONS =====
  await knex.schema.createTable('parser_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('session_name', 300).notNullable();
    table.text('description').nullable();
    table.string('source_file_name', 500).nullable();
    table.integer('total_processed_files').defaultTo(0);
    table.integer('total_included_files').defaultTo(0);
    table.integer('total_define_vars').defaultTo(0);
    table.uuid('created_by').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.timestamps(true, true);
  });

  // ===== PROCESSED FILES =====
  await knex.schema.createTable('parser_processed_files', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('session_id').notNullable().references('id').inTable('parser_sessions').onDelete('CASCADE');
    table.integer('file_type').notNullable();
    table.string('file_name', 500).notNullable();
    table.string('file_name_full', 1000).notNullable();
    table.decimal('start_ts', 20, 10).nullable();
    table.decimal('end_ts', 20, 10).nullable();
    table.decimal('time_delta', 20, 10).nullable();
    table.integer('input_line_count').defaultTo(0);
    table.integer('used_line_count').defaultTo(0);
    table.integer('empty_comment_line_count').defaultTo(0);
    table.integer('multi_line_count').defaultTo(0);
    table.integer('max_line_length').defaultTo(0);
    table.integer('min_line_length').defaultTo(0);
    table.string('max_line_ref', 500).nullable();
    table.string('min_line_ref', 500).nullable();
    table.integer('cond_if').defaultTo(0);
    table.integer('cond_else').defaultTo(0);
    table.integer('cond_elif').defaultTo(0);
    table.integer('cond_endif').defaultTo(0);
    table.integer('cond_nest_block').defaultTo(0);
    table.integer('assign_direct').defaultTo(0);
    table.integer('assign_rhs').defaultTo(0);
    table.integer('def_var_count').defaultTo(0);
    table.integer('def_hit_count').defaultTo(0);
    table.integer('undef_hit_count').defaultTo(0);
    table.integer('ctl_def_hit_count').defaultTo(0);
    table.integer('macro_hit_count').defaultTo(0);
    table.timestamps(true, true);
    table.index(['session_id']);
  });

  // ===== INCLUDED FILES =====
  await knex.schema.createTable('parser_included_files', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('session_id').notNullable().references('id').inTable('parser_sessions').onDelete('CASCADE');
    table.string('include_file_name', 500).notNullable();
    table.string('source_line_ref', 500).notNullable();
    table.timestamps(true, true);
    table.index(['session_id']);
  });

  // ===== DEFINE VARIABLES =====
  await knex.schema.createTable('parser_define_vars', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('session_id').notNullable().references('id').inTable('parser_sessions').onDelete('CASCADE');
    table.string('var_name', 500).notNullable();
    // 1st Hit Info
    table.string('first_hit_var_type', 100).nullable(); // DEFINITION, MACRO, CONDITIONAL, CONTROL, ABS_VAL_CONST, REF_DERIVED_VAL, MACRO_FUNC
    table.string('first_hit_src_scope', 100).nullable(); // DEF-LHS, COND_IF, COND_ELSE, GRP_COND_IF, GRP_COND_ELSE
    table.string('first_hit_slnr', 500).nullable();
    // Conditional ordering (nested cond)
    table.integer('cond_ord_depth').nullable();
    table.string('cond_ord_dir', 50).nullable(); // if, ifdef, else, elif
    table.string('cond_ord_slnr', 500).nullable();
    table.timestamps(true, true);
    table.index(['session_id']);
    table.index(['var_name']);
    table.index(['first_hit_var_type']);
  });

  // ===== DEFINE VAR ALL HITS =====
  await knex.schema.createTable('parser_define_var_hits', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('define_var_id').notNullable().references('id').inTable('parser_define_vars').onDelete('CASCADE');
    table.string('hit_mode', 100).nullable();
    table.string('var_type', 100).nullable();
    table.integer('depth').nullable();
    table.string('hit_slnr', 500).nullable();
    table.timestamps(true, true);
    table.index(['define_var_id']);
  });

  // ===== DEFINE VAR RELATIONS (parent, sibling, child) =====
  await knex.schema.createTable('parser_define_var_relations', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('define_var_id').notNullable().references('id').inTable('parser_define_vars').onDelete('CASCADE');
    table.string('relation_type', 20).notNullable(); // parent, sibling, child
    table.string('related_var_name', 500).notNullable();
    table.timestamps(true, true);
    table.index(['define_var_id', 'relation_type']);
  });

  // ===== DEFINE VAR VALUE ENTRIES =====
  await knex.schema.createTable('parser_define_var_values', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('define_var_id').notNullable().references('id').inTable('parser_define_vars').onDelete('CASCADE');
    table.string('value_key', 500).notNullable();
    table.jsonb('value_items').defaultTo('[]'); // array of matched line numbers
    table.timestamps(true, true);
    table.index(['define_var_id']);
  });

  // ===== NESTED CONDITIONAL STACK =====
  await knex.schema.createTable('parser_nested_cond_stack', (table) => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('session_id').notNullable().references('id').inTable('parser_sessions').onDelete('CASCADE');
    table.integer('nesting_depth').notNullable();
    table.string('last_hit_dir', 100).nullable();
    table.jsonb('cond_dir_par_list').defaultTo('[]');
    table.string('cond_dir_hit_slnr', 500).nullable();
    table.timestamps(true, true);
    table.index(['session_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  const tables = [
    'parser_nested_cond_stack',
    'parser_define_var_values',
    'parser_define_var_relations',
    'parser_define_var_hits',
    'parser_define_vars',
    'parser_included_files',
    'parser_processed_files',
    'parser_sessions',
  ];
  for (const t of tables) {
    await knex.schema.dropTableIfExists(t);
  }
}
