-- SQL_STORED_PROCEDURE dbo.Mem_Module_List_ParModule (modified 2012-04-21T07:53:24.497)



-- =============================================
-- Author:		Bill
-- Create date: 2010年4月19日14:26:26
-- Description:	读取模块信息
-- =============================================
CREATE PROCEDURE [dbo].[Mem_Module_List_ParModule]
	@ApplicationName Varchar(256),
	@ParModuleId int
AS
/*得到当前的应用程序编号*/
   DECLARE @ApplicationId  INT
   SELECT  @ApplicationId=ApplicationId FROM Db_Membership.dbo.Mem_Application WHERE ApplicationName=@ApplicationName

Select ModuleId,RightsId,RightsName From Db_Membership.dbo.Mem_Right  Where ApplicationId=@ApplicationId And ModuleId in
(select ModuleId from Db_Membership.dbo.Mem_Module where ApplicationId=@ApplicationId and ParModuleId =@ParModuleId)


GO
