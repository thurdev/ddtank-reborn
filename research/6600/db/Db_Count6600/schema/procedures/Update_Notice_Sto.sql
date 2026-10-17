-- SQL_STORED_PROCEDURE dbo.Update_Notice_Sto (modified 2012-04-21T07:53:24.967)


--Author：keny  Date：2009-12-22  Description：查询公告信息
CREATE proc Update_Notice_Sto
@Id int,
@UserName nvarchar(20),
@Content nvarchar(1000)
as
begin 
update .notice set UserName=@UserName,Content = @Content,DateTime=getDate() where Id=@Id;
end
GO
