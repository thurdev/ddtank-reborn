-- VIEW dbo.Count_UserSite_View (modified 2012-04-21T07:53:24.590)
--修改人：keny
--修改日期：2009-11-23
--修改描述：新增代理商名称列表

CREATE view [dbo].[Count_UserSite_View]
as
select  u.Id,u.userName,s.site,s.agentsname from count_site as s left join count_userSite as u on u.site=s.site




GO
