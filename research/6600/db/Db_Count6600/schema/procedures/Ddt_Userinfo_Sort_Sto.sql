-- SQL_STORED_PROCEDURE dbo.Ddt_Userinfo_Sort_Sto (modified 2012-04-21T07:53:25.013)
--创建人:向洪
--创建时间:2009-7-6
--说明:给运营商提供一个接口（用户账号或昵称，类型）
CREATE  PROCEDURE  [dbo].[Ddt_Userinfo_Sort_Sto] 
@SearchKey Varchar(4000),
@SelectType Int
AS
If @SelectType=1
    Begin
	select username,nickname,grade,gp from Db_Tank_Copy.dbo.Sys_Users_Detail where CharIndex(','+Cast(username as VarChar(50))+',',','+@SearchKey)>0
    End
ELSE
    Begin
	select username,nickname,grade,gp from Db_Tank_Copy.dbo.Sys_Users_Detail where CharIndex(','+Cast(nickname as VarChar(50))+',',','+@SearchKey)>0
    End


GO
