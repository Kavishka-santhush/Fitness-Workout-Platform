const prisma = require('../lib/prisma');
const { paginated, ok, created, notFound } = require('./response.util');

/**
 * Generic CRUD factory bound to a Prisma model delegate.
 * Domains with heavy custom logic override specific methods in their service;
 * controllers reuse `crudHandlers(service)` for the standard five endpoints.
 */
const makeCrud = (model, { include, orderBy = { createdAt: 'desc' }, softDeleteField } = {}) => {
  const delegate = () => prisma[model];

  return {
    async list({ page = 1, limit = 20, where = {} } = {}) {
      const [items, total] = await Promise.all([
        delegate().findMany({ where, include, orderBy, skip: (page - 1) * limit, take: limit }),
        delegate().count({ where }),
      ]);
      return { items, page, limit, total };
    },

    async get(id) {
      const item = await delegate().findUnique({ where: { id }, include });
      if (!item) throw notFound(`${model} not found`);
      return item;
    },

    async create(data, userId = undefined) {
      const payload = { ...data };
      if (userId && payload.userId === undefined && softDeleteField !== 'noOwner') payload.userId = userId;
      return delegate().create({ data: payload, include });
    },

    async update(id, data) {
      await delegate().update({ where: { id }, data });
      return delegate().findUnique({ where: { id }, include });
    },

    async remove(id) {
      if (softDeleteField) {
        await delegate().update({ where: { id }, data: { [softDeleteField]: 'ARCHIVED' } });
      } else {
        await delegate().delete({ where: { id } });
      }
      return true;
    },
  };
};

/** Standard controller wiring for a crud service. */
const crudHandlers = (service, messages = {}) => ({
  async list(req, res) {
    const { page, limit, ...rest } = req.query;
    const { items, total } = await service.list({ page: +page || 1, limit: +limit || 20, where: rest.where || {} });
    paginated(res, items, { page: +page || 1, limit: +limit || 20, total });
  },
  async get(req, res) {
    ok(res, await service.get(req.params.id));
  },
  async create(req, res) {
    created(res, await service.create(req.body, req.user?.id), messages.created || 'Created');
  },
  async update(req, res) {
    ok(res, await service.update(req.params.id, req.body), messages.updated || 'Updated');
  },
  async remove(req, res) {
    await service.remove(req.params.id);
    ok(res, null, messages.deleted || 'Deleted');
  },
});

module.exports = { makeCrud, crudHandlers };
