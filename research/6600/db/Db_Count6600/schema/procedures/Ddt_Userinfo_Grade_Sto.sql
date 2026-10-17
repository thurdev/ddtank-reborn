-- SQL_STORED_PROCEDURE dbo.Ddt_Userinfo_Grade_Sto (modified 2012-04-21T07:53:24.763)
--创建人:向洪
--创建时间:2009-7-6
--说明:给VS运营商提供一个接口（用户账号或昵称，类型）
CREATE  PROCEDURE  [dbo].[Ddt_Userinfo_Grade_Sto] 
@SearchKey Varchar(4000),
@SelectType Int
AS
If @SelectType=1
    Begin
	select username,nickname,grade,gp from Db_Tank.dbo.Sys_Users_Detail with(nolock) where CharIndex(','+Cast(username as VarChar(50))+',',','+@SearchKey)>0
    End
ELSE
    Begin
	select username,nickname,grade,gp from Db_Tank.dbo.Sys_Users_Detail with(nolock) where CharIndex(','+Cast(nickname as VarChar(50))+',',','+@SearchKey)>0
    End
GO
