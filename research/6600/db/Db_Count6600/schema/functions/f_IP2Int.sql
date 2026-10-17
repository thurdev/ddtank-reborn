-- SQL_SCALAR_FUNCTION dbo.f_IP2Int (modified 2025-11-03T04:46:08.190)

/*--字符型   IP   地址转换成数字   IP   
    
  --邹建   2004.08(引用请保留此信息)--*/   
    
  /*--调用示例   
    
  select   dbo.f_IP2Int('192.168.0.11')   
  select   dbo.f_IP2Int('12.168.0.1')   
  --*/   
  CREATE   FUNCTION   f_IP2Int(   
  @ip   char(15)   
  )RETURNS   bigint   
  AS   
  BEGIN   
  DECLARE   @re   bigint   
  SET   @re=0   
  SELECT   @re=@re+LEFT(@ip,CHARINDEX('.',@ip+'.')-1)*ID   
  ,@ip=STUFF(@ip,1,CHARINDEX('.',@ip+'.'),'')   
  FROM(   
  SELECT   ID=CAST(16777216   as   bigint)   
  UNION   ALL   SELECT   65536   
  UNION   ALL   SELECT   256   
  UNION   ALL   SELECT   1)A   
  RETURN(@re)   
  END   
  
GO
