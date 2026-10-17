-- VIEW dbo.Ddt_Celeb_AddweekGp_view (modified 2012-04-21T07:53:24.687)

-- =========================================================================================
-- Author :  watson
-- Alter date : 2009-09-23
-- Description :  名人堂个人等级周增榜前三位玩家账号和角色名。
-- Param : 无参数
-- Return : 无返回参数
-- =========================================================================================
--Update  Author :  keny
-- Update date : 2009-12-02
-- Description :  名人堂个人等级周增榜前五十位玩家账号和角色名。
-- Param : 无参数
-- Return : 无返回参数
-- =========================================================================================
CREATE VIEW [dbo].[Ddt_Celeb_AddweekGp_view]
AS
select top 50 userid as id,username,nickname,grade,addweekgp from db_tank_copy..sys_users_detail
order by addweekgp desc





GO
