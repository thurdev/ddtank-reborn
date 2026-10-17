-- SQL_STORED_PROCEDURE dbo.Update_Vindicate_Sto (modified 2012-04-21T07:53:24.983)




--Author: keny  Date : 2009-12-22  Description : 修改维护时间
CREATE proc Update_Vindicate_Sto
@Id int,
@UserName nvarchar(20),
@BeginTime nvarchar(20),
@EndTime nvarchar(20),
@Content nvarchar(100),
@Server int,
@State int
as 
begin 
update Vindicate set UserName = @UserName,BeginTime = @BeginTime,EndTime = @EndTime,Content=@Content,State = @State where Server = @Server;
end


GO
