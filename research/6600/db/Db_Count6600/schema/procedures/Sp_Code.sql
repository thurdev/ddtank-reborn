-- SQL_STORED_PROCEDURE dbo.Sp_Code (modified 2012-04-21T07:53:25.200)
CREATE    PROCEDURE [dbo].[Sp_Code]  
 @code varchar(50), 
 @ouototal varchar(50)='' output AS  
/*功能:获取当前最大值生成是有序的*/
/*定义变量*/
declare @oldid bigint  /*以前最大值*/
declare @newid bigint  /*现在最大值*/
/*第一步：得到之前最大值*/
  Set @oldid=0 
  select  @oldid=IsNull(codenumber,0)   from Count_Code where code= @code 
if @oldid<1
  Begin
    INSERT INTO Count_Code(code,codenumber) VALUES (@code,1)
  End
Else
  Begin 
   set  @ouototal=@oldid+1
   update Count_Code set codenumber=@ouototal  where code=@code
  End


GO
